-- Update AI tool functions

-- Update get_customer_details to include more comprehensive data
CREATE OR REPLACE FUNCTION get_customer_details()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get current user's organization
    SELECT get_current_user_org_id() INTO v_org_id;
    
    RETURN (
        SELECT 
            JSONB_BUILD_OBJECT(
                'customers', (
                    SELECT JSONB_AGG(
                        JSONB_BUILD_OBJECT(
                            'customer_id', c.customer_id,
                            'name', c.name,
                            'email', c.email,
                            'created_at', c.created_at,
                            'metadata', c.metadata,
                            'ticket_summary', (
                                SELECT JSONB_BUILD_OBJECT(
                                    'total_tickets', COUNT(*),
                                    'open_tickets', COUNT(*) FILTER (WHERE status = 'open'),
                                    'resolved_tickets', COUNT(*) FILTER (WHERE status = 'resolved'),
                                    'avg_resolution_time', get_agent_avg_resolution_time(agent_id),
                                    'satisfaction_score', 
                                        AVG(satisfaction_score) FILTER (WHERE satisfaction_score IS NOT NULL)
                                )
                                FROM tickets t
                                WHERE t.customer_id = c.customer_id
                            ),
                            'recent_interactions', (
                                SELECT JSONB_AGG(
                                    JSONB_BUILD_OBJECT(
                                        'ticket_id', t.ticket_id,
                                        'title', t.title,
                                        'status', t.status,
                                        'priority', t.priority,
                                        'created_at', t.created_at,
                                        'satisfaction_score', t.satisfaction_score
                                    )
                                    ORDER BY t.created_at DESC
                                )
                                FROM (
                                    SELECT *
                                    FROM tickets
                                    WHERE customer_id = c.customer_id
                                    ORDER BY created_at DESC
                                    LIMIT 5
                                ) t
                            )
                        )
                    )
                    FROM customers c
                    WHERE c.organization_id = v_org_id
                ),
                'generated_at', CURRENT_TIMESTAMP
            )
    );
END;
$$;

-- Update get_agent_performance to include more metrics
CREATE OR REPLACE FUNCTION get_agent_performance(
    p_agent_id UUID,
    p_metric_type TEXT,
    p_timeframe TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMP;
    v_result JSONB;
BEGIN
    -- Calculate start date based on timeframe
    v_start_date := CASE p_timeframe
        WHEN 'today' THEN CURRENT_DATE
        WHEN 'week' THEN CURRENT_DATE - INTERVAL '7 days'
        WHEN 'month' THEN CURRENT_DATE - INTERVAL '30 days'
        WHEN 'quarter' THEN CURRENT_DATE - INTERVAL '90 days'
        ELSE CURRENT_DATE - INTERVAL '30 days'  -- default to month
    END;

    -- Get performance metrics based on type
    SELECT 
        JSONB_BUILD_OBJECT(
            'agent_id', p_agent_id,
            'timeframe', p_timeframe,
            'metric_type', p_metric_type,
            'metrics', CASE p_metric_type
                WHEN 'response_time' THEN (
                    SELECT JSONB_BUILD_OBJECT(
                        'avg_response_time', get_agent_avg_response_time(p_agent_id),
                        'avg_resolution_time', get_agent_avg_resolution_time(p_agent_id),
                        'response_time_distribution', (
                            SELECT JSONB_OBJECT_AGG(
                                priority,
                                get_agent_avg_response_time(p_agent_id)
                            )
                            FROM (
                                SELECT DISTINCT priority 
                                FROM tickets 
                                WHERE agent_id = p_agent_id 
                                AND created_at >= v_start_date
                            ) priorities
                        )
                    )
                )
                WHEN 'workload' THEN (
                    SELECT JSONB_BUILD_OBJECT(
                        'total_tickets', COUNT(*),
                        'open_tickets', (
                            SELECT COUNT(*)
                            FROM tickets
                            WHERE agent_id = p_agent_id
                            AND created_at >= v_start_date
                            AND status = 'open'
                        ),
                        'resolved_tickets', (
                            SELECT COUNT(*)
                            FROM tickets
                            WHERE agent_id = p_agent_id
                            AND created_at >= v_start_date
                            AND status = 'resolved'
                        ),
                        'priority_distribution', (
                            SELECT JSONB_OBJECT_AGG(
                                priority,
                                COUNT(*)
                            )
                            FROM tickets
                            WHERE agent_id = p_agent_id
                            AND created_at >= v_start_date
                            GROUP BY priority
                        )
                    )
                    FROM tickets
                    WHERE agent_id = p_agent_id
                    AND created_at >= v_start_date
                )
                WHEN 'satisfaction' THEN (
                    SELECT JSONB_BUILD_OBJECT(
                        'avg_satisfaction', (
                            SELECT AVG(satisfaction_score)
                            FROM tickets
                            WHERE agent_id = p_agent_id
                            AND created_at >= v_start_date
                            AND satisfaction_score IS NOT NULL
                        ),
                        'satisfaction_distribution', (
                            SELECT JSONB_OBJECT_AGG(
                                satisfaction_score::TEXT,
                                COUNT(*)
                            )
                            FROM tickets
                            WHERE agent_id = p_agent_id
                            AND created_at >= v_start_date
                            AND satisfaction_score IS NOT NULL
                            GROUP BY satisfaction_score
                        )
                    )
                )
                ELSE (
                    SELECT JSONB_BUILD_OBJECT(
                        'error', 'Invalid metric type'
                    )
                )
            END,
            'generated_at', CURRENT_TIMESTAMP
        ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_details() TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_performance(UUID, TEXT, TEXT) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_agent_performance 
ON tickets (agent_id, created_at, status, priority, satisfaction_score);

-- Note: Removed the response_times index since we're using functions instead of direct columns 