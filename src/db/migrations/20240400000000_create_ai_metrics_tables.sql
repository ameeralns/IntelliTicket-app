-- Create AI metrics tables
CREATE TABLE IF NOT EXISTS ai_tool_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_name TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL,
    confidence FLOAT NOT NULL,
    error_type TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    organization_id UUID REFERENCES organizations(id)
);

CREATE INDEX idx_ai_tool_metrics_tool_name ON ai_tool_metrics(tool_name);
CREATE INDEX idx_ai_tool_metrics_created_at ON ai_tool_metrics(created_at);
CREATE INDEX idx_ai_tool_metrics_organization ON ai_tool_metrics(organization_id);

-- Function to get AI tool metrics
CREATE OR REPLACE FUNCTION get_ai_tool_metrics(
    p_tool_name TEXT DEFAULT NULL,
    p_timeframe TEXT DEFAULT 'day',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_metrics JSONB;
BEGIN
    -- Calculate start time based on timeframe
    v_start_time := CASE p_timeframe
        WHEN 'hour' THEN NOW() - INTERVAL '1 hour'
        WHEN 'day' THEN NOW() - INTERVAL '1 day'
        WHEN 'week' THEN NOW() - INTERVAL '1 week'
        WHEN 'month' THEN NOW() - INTERVAL '1 month'
        ELSE NOW() - INTERVAL '1 day'
    END;

    -- Build base query
    WITH filtered_metrics AS (
        SELECT *
        FROM ai_tool_metrics
        WHERE created_at >= v_start_time
        AND (p_tool_name IS NULL OR tool_name = p_tool_name)
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    ),
    error_dist AS (
        SELECT 
            error_type,
            COUNT(*) as error_count
        FROM filtered_metrics
        WHERE NOT success
        AND error_type IS NOT NULL
        GROUP BY error_type
    ),
    percentiles AS (
        SELECT
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
            percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
        FROM filtered_metrics
    )
    SELECT jsonb_build_object(
        'total_calls', COUNT(*),
        'successful_calls', COUNT(*) FILTER (WHERE success),
        'failed_calls', COUNT(*) FILTER (WHERE NOT success),
        'average_latency_ms', AVG(latency_ms),
        'average_confidence', AVG(confidence),
        'error_distribution', COALESCE(
            (SELECT jsonb_object_agg(error_type, error_count)
            FROM error_dist),
            '{}'::jsonb
        ),
        'p95_latency_ms', (SELECT p95 FROM percentiles),
        'p99_latency_ms', (SELECT p99 FROM percentiles)
    ) INTO v_metrics
    FROM filtered_metrics;

    RETURN v_metrics;
END;
$$;

-- Function to analyze tool performance trends
CREATE OR REPLACE FUNCTION analyze_tool_performance_trends(
    p_tool_name TEXT,
    p_timeframe TEXT DEFAULT 'week',
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_interval TEXT;
    v_trends JSONB;
BEGIN
    -- Set timeframe parameters
    SELECT
        CASE p_timeframe
            WHEN 'day' THEN NOW() - INTERVAL '1 day'
            WHEN 'week' THEN NOW() - INTERVAL '1 week'
            WHEN 'month' THEN NOW() - INTERVAL '1 month'
            ELSE NOW() - INTERVAL '1 week'
        END,
        CASE p_timeframe
            WHEN 'day' THEN '1 hour'
            WHEN 'week' THEN '1 day'
            WHEN 'month' THEN '1 week'
            ELSE '1 day'
        END
    INTO v_start_time, v_interval;

    -- Calculate trends
    WITH time_series AS (
        SELECT
            time_bucket(v_interval::interval, created_at) as period,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE success) as successful_calls,
            AVG(latency_ms) as avg_latency,
            AVG(confidence) as avg_confidence
        FROM ai_tool_metrics
        WHERE created_at >= v_start_time
        AND tool_name = p_tool_name
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        GROUP BY period
        ORDER BY period
    ),
    metrics AS (
        SELECT
            period,
            total_calls,
            successful_calls,
            avg_latency,
            avg_confidence,
            LAG(total_calls) OVER (ORDER BY period) as prev_total_calls,
            LAG(successful_calls) OVER (ORDER BY period) as prev_successful_calls,
            LAG(avg_latency) OVER (ORDER BY period) as prev_avg_latency,
            LAG(avg_confidence) OVER (ORDER BY period) as prev_avg_confidence
        FROM time_series
    )
    SELECT jsonb_build_object(
        'periods', jsonb_agg(
            jsonb_build_object(
                'period', period,
                'metrics', jsonb_build_object(
                    'total_calls', total_calls,
                    'successful_calls', successful_calls,
                    'success_rate', (successful_calls::float / NULLIF(total_calls, 0)::float),
                    'avg_latency', avg_latency,
                    'avg_confidence', avg_confidence,
                    'changes', jsonb_build_object(
                        'total_calls_change', CASE 
                            WHEN prev_total_calls IS NULL THEN 0
                            ELSE ((total_calls - prev_total_calls)::float / NULLIF(prev_total_calls, 0)::float) * 100
                        END,
                        'success_rate_change', CASE 
                            WHEN prev_successful_calls IS NULL THEN 0
                            ELSE (((successful_calls::float / NULLIF(total_calls, 0)) - 
                                  (prev_successful_calls::float / NULLIF(prev_total_calls, 0))) * 100)
                        END,
                        'latency_change', CASE 
                            WHEN prev_avg_latency IS NULL THEN 0
                            ELSE ((avg_latency - prev_avg_latency) / NULLIF(prev_avg_latency, 0)) * 100
                        END,
                        'confidence_change', CASE 
                            WHEN prev_avg_confidence IS NULL THEN 0
                            ELSE ((avg_confidence - prev_avg_confidence) / NULLIF(prev_avg_confidence, 0)) * 100
                        END
                    )
                )
            )
            ORDER BY period
        )
    ) INTO v_trends
    FROM metrics;

    RETURN v_trends;
END;
$$; 