-- Create all required functions for AI tools

-- Team Query Tool Function
CREATE OR REPLACE FUNCTION get_team_metrics(
    p_team_id UUID,
    p_metric_type TEXT,
    p_days INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMP;
BEGIN
    v_start_date := NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN jsonb_build_object(
        'team_id', p_team_id,
        'metric_type', p_metric_type,
        'period_days', p_days,
        'metrics', (
            SELECT jsonb_build_object(
                'total_tickets', COUNT(*),
                'resolved_tickets', COUNT(*) FILTER (WHERE t.status = 'Resolved'),
                'avg_resolution_time', AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))) FILTER (WHERE t.status = 'Resolved'),
                'avg_response_time', AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at))) FILTER (WHERE t.first_response_at IS NOT NULL),
                'satisfaction_score', AVG(t.satisfaction_rating) FILTER (WHERE t.satisfaction_rating IS NOT NULL)
            )
            FROM tickets t
            JOIN agents a ON t.agent_id = a.agent_id
            WHERE a.team_id = p_team_id
            AND t.created_at >= v_start_date
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Customer Analysis Tool Function
CREATE OR REPLACE FUNCTION analyze_customer_behavior(
    p_customer_id UUID,
    p_days INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMP;
BEGIN
    v_start_date := NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN (
        SELECT jsonb_build_object(
            'customer_id', p_customer_id,
            'period_days', p_days,
            'metrics', jsonb_build_object(
                'total_tickets', COUNT(*),
                'resolved_tickets', COUNT(*) FILTER (WHERE status = 'Resolved'),
                'avg_resolution_time', AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE status = 'Resolved'),
                'satisfaction_scores', array_agg(satisfaction_rating) FILTER (WHERE satisfaction_rating IS NOT NULL),
                'common_issues', (
                    SELECT array_agg(DISTINCT category) 
                    FROM tickets t2 
                    WHERE t2.customer_id = p_customer_id
                )
            )
        )
        FROM tickets t
        WHERE t.customer_id = p_customer_id
        AND t.created_at >= v_start_date
    );
END;
$$ LANGUAGE plpgsql;

-- Workload Optimization Tool Function
CREATE OR REPLACE FUNCTION optimize_team_workload(
    p_team_id UUID,
    p_config JSONB
) RETURNS JSONB AS $$
DECLARE
    v_max_tickets INTEGER;
BEGIN
    v_max_tickets := (p_config->>'max_tickets_per_agent')::INTEGER;
    
    RETURN jsonb_build_object(
        'team_id', p_team_id,
        'workload_stats', (
            SELECT jsonb_build_object(
                'agent_stats', jsonb_agg(
                    jsonb_build_object(
                        'agent_id', a.agent_id,
                        'current_tickets', COUNT(t.ticket_id),
                        'capacity_available', v_max_tickets - COUNT(t.ticket_id)
                    )
                ),
                'team_capacity', jsonb_build_object(
                    'total_agents', COUNT(DISTINCT a.agent_id),
                    'total_capacity', COUNT(DISTINCT a.agent_id) * v_max_tickets,
                    'current_load', COUNT(t.ticket_id),
                    'available_capacity', (COUNT(DISTINCT a.agent_id) * v_max_tickets) - COUNT(t.ticket_id)
                )
            )
            FROM agents a
            LEFT JOIN tickets t ON t.agent_id = a.agent_id AND t.status NOT IN ('Resolved', 'Closed')
            WHERE a.team_id = p_team_id
            GROUP BY a.team_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create Automation Rule Function
CREATE OR REPLACE FUNCTION create_automation_rule(
    p_organization_id UUID,
    p_rule_config JSONB
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO automation_rules (
        organization_id,
        name,
        condition_expression,
        action_type,
        action_parameters,
        is_active
    ) VALUES (
        p_organization_id,
        p_rule_config->>'name',
        p_rule_config->>'condition',
        p_rule_config->>'action',
        p_rule_config,
        TRUE
    );
    
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Automation rule created successfully',
        'rule_config', p_rule_config
    );
END;
$$ LANGUAGE plpgsql;

-- Create SLA Policy Function
CREATE OR REPLACE FUNCTION create_sla_policy(
    p_organization_id UUID,
    p_policy_config JSONB
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO sla_policies (
        organization_id,
        name,
        priority,
        response_time_threshold,
        resolution_time_threshold,
        is_active
    ) VALUES (
        p_organization_id,
        p_policy_config->>'name',
        p_policy_config->>'priority',
        (p_policy_config->>'response_time')::interval,
        (p_policy_config->>'resolution_time')::interval,
        TRUE
    );
    
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'SLA policy created successfully',
        'policy_config', p_policy_config
    );
END;
$$ LANGUAGE plpgsql;

-- Update Team Function
CREATE OR REPLACE FUNCTION update_team(
    p_team_id UUID,
    p_team_config JSONB
) RETURNS JSONB AS $$
BEGIN
    UPDATE teams SET
        name = COALESCE(p_team_config->>'name', name),
        description = COALESCE(p_team_config->>'description', description),
        updated_at = NOW()
    WHERE team_id = p_team_id;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Team updated successfully',
        'team_id', p_team_id,
        'updates', p_team_config
    );
END;
$$ LANGUAGE plpgsql;

-- Bulk Assign Tickets Function
CREATE OR REPLACE FUNCTION bulk_assign_tickets(
    p_ticket_ids UUID[],
    p_agent_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE tickets
        SET 
            agent_id = p_agent_id,
            status = 'Assigned',
            updated_at = NOW()
        WHERE ticket_id = ANY(p_ticket_ids)
        RETURNING ticket_id
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Tickets assigned successfully',
        'assigned_count', v_updated_count,
        'agent_id', p_agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create core AI tool functions

-- Function to get organization structure
CREATE OR REPLACE FUNCTION get_organization_structure(
    p_organization_id UUID
) RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'teams', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'team_id', t.team_id,
                        'name', t.name,
                        'agents', (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'agent_id', a.agent_id,
                                    'name', a.name,
                                    'email', a.email,
                                    'role', a.role,
                                    'active_tickets', (
                                        SELECT COUNT(*)
                                        FROM tickets tk
                                        WHERE tk.agent_id = a.agent_id
                                        AND tk.status NOT IN ('Resolved', 'Closed')
                                    )
                                )
                            )
                            FROM agents a
                            WHERE a.team_id = t.team_id
                        )
                    )
                )
                FROM teams t
                WHERE t.organization_id = p_organization_id
            ),
            'customers', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'customer_id', c.customer_id,
                        'name', c.name,
                        'email', c.email,
                        'total_tickets', (
                            SELECT COUNT(*)
                            FROM tickets tk
                            WHERE tk.customer_id = c.customer_id
                        )
                    )
                )
                FROM customers c
                WHERE c.organization_id = p_organization_id
            )
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to assign/reassign tickets
CREATE OR REPLACE FUNCTION manage_ticket_assignment(
    p_ticket_ids UUID[],
    p_agent_id UUID,
    p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_updated_count INTEGER;
    v_agent_name TEXT;
BEGIN
    -- Verify agent belongs to organization
    IF NOT EXISTS (
        SELECT 1 FROM agents 
        WHERE agent_id = p_agent_id 
        AND organization_id = p_organization_id
    ) THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Agent does not belong to the organization'
        );
    END IF;

    -- Get agent name for response
    SELECT name INTO v_agent_name
    FROM agents
    WHERE agent_id = p_agent_id;

    -- Update tickets
    WITH updated AS (
        UPDATE tickets
        SET 
            agent_id = p_agent_id,
            status = CASE 
                WHEN status = 'New' THEN 'Assigned'
                ELSE status 
            END,
            updated_at = NOW()
        WHERE ticket_id = ANY(p_ticket_ids)
        AND organization_id = p_organization_id
        RETURNING ticket_id
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
    
    RETURN jsonb_build_object(
        'status', 'success',
        'message', v_updated_count || ' tickets assigned to ' || v_agent_name,
        'assigned_count', v_updated_count,
        'agent_id', p_agent_id,
        'agent_name', v_agent_name
    );
END;
$$ LANGUAGE plpgsql; 