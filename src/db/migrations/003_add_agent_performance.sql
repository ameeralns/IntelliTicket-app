-- Create agent performance tracking tables
CREATE TABLE IF NOT EXISTS autocrm.agent_performance (
    performance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES autocrm.agents(agent_id),
    organization_id UUID NOT NULL,
    time_period TSTZRANGE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{
        "confidenceScores": [],
        "responseLatencies": [],
        "escalationRate": 0,
        "successRate": 0,
        "averageConfidence": 0,
        "p95Latency": 0
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autocrm.workflow_performance (
    performance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    time_period TSTZRANGE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{
        "completionTimes": [],
        "stepCounts": [],
        "escalationCounts": [],
        "averageCompletionTime": 0,
        "averageStepCount": 0,
        "escalationRate": 0,
        "automationRate": 0,
        "bottlenecks": []
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agent_performance_agent ON autocrm.agent_performance(agent_id);
CREATE INDEX idx_agent_performance_org ON autocrm.agent_performance(organization_id);
CREATE INDEX idx_agent_performance_time ON autocrm.agent_performance USING GIST (time_period);

CREATE INDEX idx_workflow_performance_org ON autocrm.workflow_performance(organization_id);
CREATE INDEX idx_workflow_performance_time ON autocrm.workflow_performance USING GIST (time_period);

-- Add triggers for updated_at
CREATE TRIGGER update_agent_performance_updated_at
    BEFORE UPDATE ON autocrm.agent_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_performance_updated_at
    BEFORE UPDATE ON autocrm.workflow_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create performance calculation functions
CREATE OR REPLACE FUNCTION calculate_agent_performance(
    p_agent_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    WITH metrics AS (
        SELECT
            array_agg(confidence) as confidence_scores,
            array_agg(latency_ms) as latencies,
            COUNT(*) FILTER (WHERE action_type = 'ESCALATE')::FLOAT / COUNT(*)::FLOAT as escalation_rate,
            COUNT(*) FILTER (WHERE success)::FLOAT / COUNT(*)::FLOAT as success_rate,
            AVG(confidence) as avg_confidence,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
        FROM autocrm.agent_actions
        WHERE agent_id = p_agent_id
        AND created_at BETWEEN p_start_time AND p_end_time
    )
    SELECT jsonb_build_object(
        'confidenceScores', COALESCE(confidence_scores, '[]'::JSONB),
        'responseLatencies', COALESCE(latencies, '[]'::JSONB),
        'escalationRate', COALESCE(escalation_rate, 0),
        'successRate', COALESCE(success_rate, 0),
        'averageConfidence', COALESCE(avg_confidence, 0),
        'p95Latency', COALESCE(p95_latency, 0)
    )
    INTO v_metrics
    FROM metrics;

    RETURN v_metrics;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_workflow_performance(
    p_organization_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    WITH workflow_metrics AS (
        SELECT
            array_agg(
                EXTRACT(EPOCH FROM (end_time - start_time))
            ) as completion_times,
            array_agg(
                (SELECT COUNT(*) FROM autocrm.agent_actions aa WHERE aa.session_id = ws.session_id)
            ) as step_counts,
            array_agg(
                (SELECT COUNT(*) FROM autocrm.agent_actions aa 
                 WHERE aa.session_id = ws.session_id AND aa.action_type = 'ESCALATE')
            ) as escalation_counts,
            AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_completion_time,
            AVG((SELECT COUNT(*) FROM autocrm.agent_actions aa WHERE aa.session_id = ws.session_id)) as avg_step_count,
            COUNT(*) FILTER (WHERE requires_human_intervention)::FLOAT / COUNT(*)::FLOAT as escalation_rate,
            COUNT(*) FILTER (WHERE NOT requires_human_intervention)::FLOAT / COUNT(*)::FLOAT as automation_rate,
            array_agg(DISTINCT state) FILTER (
                WHERE state IN (
                    SELECT state
                    FROM autocrm.agent_actions aa2
                    WHERE aa2.session_id = ws.session_id
                    GROUP BY state
                    HAVING AVG(latency_ms) > 30000 AND COUNT(*) > 10
                )
            ) as bottlenecks
        FROM autocrm.workflow_sessions ws
        WHERE organization_id = p_organization_id
        AND created_at BETWEEN p_start_time AND p_end_time
    )
    SELECT jsonb_build_object(
        'completionTimes', COALESCE(completion_times, '[]'::JSONB),
        'stepCounts', COALESCE(step_counts, '[]'::JSONB),
        'escalationCounts', COALESCE(escalation_counts, '[]'::JSONB),
        'averageCompletionTime', COALESCE(avg_completion_time, 0),
        'averageStepCount', COALESCE(avg_step_count, 0),
        'escalationRate', COALESCE(escalation_rate, 0),
        'automationRate', COALESCE(automation_rate, 0),
        'bottlenecks', COALESCE(bottlenecks, '[]'::JSONB)
    )
    INTO v_metrics
    FROM workflow_metrics;

    RETURN v_metrics;
END;
$$;

-- Create function to update performance metrics
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent_metrics JSONB;
    v_workflow_metrics JSONB;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Calculate period (last hour)
    v_period_end := date_trunc('hour', NOW());
    v_period_start := v_period_end - interval '1 hour';

    -- Update agent performance
    v_agent_metrics := calculate_agent_performance(NEW.agent_id, v_period_start, v_period_end);
    
    INSERT INTO autocrm.agent_performance (
        agent_id,
        organization_id,
        time_period,
        metrics
    )
    VALUES (
        NEW.agent_id,
        NEW.organization_id,
        tstzrange(v_period_start, v_period_end, '[]'),
        v_agent_metrics
    )
    ON CONFLICT (agent_id, time_period)
    DO UPDATE SET
        metrics = v_agent_metrics,
        updated_at = NOW();

    -- Update workflow performance
    v_workflow_metrics := calculate_workflow_performance(NEW.organization_id, v_period_start, v_period_end);
    
    INSERT INTO autocrm.workflow_performance (
        organization_id,
        time_period,
        metrics
    )
    VALUES (
        NEW.organization_id,
        tstzrange(v_period_start, v_period_end, '[]'),
        v_workflow_metrics
    )
    ON CONFLICT (organization_id, time_period)
    DO UPDATE SET
        metrics = v_workflow_metrics,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Create trigger to update performance metrics on agent action
CREATE TRIGGER update_performance_on_action
    AFTER INSERT ON autocrm.agent_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics(); 