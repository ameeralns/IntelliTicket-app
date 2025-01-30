-- File: 006_add_admin_intelligence.sql
-- Description: Adds Admin Intelligence feature with natural language command processing and query capabilities

-- Create table for admin AI commands and their results
CREATE TABLE IF NOT EXISTS autocrm.admin_ai_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    admin_id UUID REFERENCES users(user_id),
    command_type VARCHAR(50) NOT NULL CHECK (
        command_type IN (
            'ASSIGN_TICKET',
            'REASSIGN_TICKET',
            'CHANGE_PRIORITY',
            'QUERY_WORKLOAD',
            'QUERY_PERFORMANCE',
            'QUERY_FEEDBACK',
            'QUERY_METRICS'
        )
    ),
    command_text TEXT NOT NULL,
    parameters JSONB NOT NULL,
    result JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'success', 'failed', 'needs_confirmation')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create functions for admin queries

-- Function to get agent's current ticket count and details
CREATE OR REPLACE FUNCTION get_agent_ticket_summary(agent_uuid UUID)
RETURNS TABLE (
    total_tickets BIGINT,
    active_tickets BIGINT,
    tickets_today BIGINT,
    high_priority_tickets BIGINT,
    ticket_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE t.status NOT IN ('Resolved', 'Closed')),
        COUNT(*) FILTER (WHERE t.created_at >= CURRENT_DATE),
        COUNT(*) FILTER (WHERE t.priority = 'High' AND t.status NOT IN ('Resolved', 'Closed')),
        jsonb_build_object(
            'by_priority', jsonb_object_agg(
                t.priority, COUNT(*)
            ),
            'by_status', jsonb_object_agg(
                t.status, COUNT(*)
            ),
            'recent_tickets', (
                SELECT jsonb_agg(ticket_info)
                FROM (
                    SELECT ticket_id, title, status, priority, created_at
                    FROM tickets t2
                    WHERE t2.agent_id = agent_uuid
                    ORDER BY created_at DESC
                    LIMIT 5
                ) ticket_info
            )
        ) as ticket_details
    FROM tickets t
    WHERE t.agent_id = agent_uuid
    GROUP BY t.agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization's ticket overview
CREATE OR REPLACE FUNCTION get_organization_ticket_summary(org_uuid UUID)
RETURNS TABLE (
    total_active_tickets BIGINT,
    tickets_created_today BIGINT,
    tickets_resolved_today BIGINT,
    avg_resolution_time FLOAT,
    ticket_distribution JSONB,
    customer_satisfaction JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH ticket_stats AS (
        SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('Resolved', 'Closed')) as active,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as created_today,
            COUNT(*) FILTER (WHERE DATE(resolved_at) = CURRENT_DATE) as resolved_today,
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours,
            jsonb_build_object(
                'by_priority', jsonb_object_agg(
                    priority, COUNT(*)
                ),
                'by_status', jsonb_object_agg(
                    status, COUNT(*)
                ),
                'by_agent', (
                    SELECT jsonb_object_agg(
                        a.name, COUNT(*)
                    )
                    FROM tickets t2
                    JOIN agents a ON t2.agent_id = a.agent_id
                    WHERE t2.organization_id = org_uuid
                    GROUP BY a.name
                )
            ) as distribution,
            jsonb_build_object(
                'average_rating', AVG(customer_satisfaction),
                'rating_distribution', jsonb_object_agg(
                    customer_satisfaction, COUNT(*)
                ),
                'recent_feedback', (
                    SELECT jsonb_agg(feedback)
                    FROM (
                        SELECT customer_satisfaction, feedback_text, created_at
                        FROM tickets t2
                        WHERE t2.organization_id = org_uuid
                        AND customer_satisfaction IS NOT NULL
                        ORDER BY created_at DESC
                        LIMIT 5
                    ) feedback
                )
            ) as satisfaction
        FROM tickets t
        WHERE t.organization_id = org_uuid
        GROUP BY t.organization_id
    )
    SELECT
        active,
        created_today,
        resolved_today,
        avg_resolution_hours,
        distribution,
        satisfaction
    FROM ticket_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to process admin commands
CREATE OR REPLACE FUNCTION process_admin_command(
    p_admin_id UUID,
    p_organization_id UUID,
    p_command_type VARCHAR,
    p_command_text TEXT,
    p_parameters JSONB
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_ticket_id UUID;
    v_agent_id UUID;
BEGIN
    -- Insert the command into the interactions table
    INSERT INTO autocrm.admin_ai_interactions (
        admin_id,
        organization_id,
        command_type,
        command_text,
        parameters
    ) VALUES (
        p_admin_id,
        p_organization_id,
        p_command_type,
        p_command_text,
        p_parameters
    ) RETURNING result INTO v_result;

    -- Process different command types
    CASE p_command_type
        WHEN 'ASSIGN_TICKET' THEN
            v_ticket_id := (p_parameters->>'ticket_id')::UUID;
            v_agent_id := (p_parameters->>'agent_id')::UUID;
            
            -- Update ticket assignment
            UPDATE tickets
            SET agent_id = v_agent_id,
                updated_at = NOW()
            WHERE ticket_id = v_ticket_id
            AND organization_id = p_organization_id
            RETURNING jsonb_build_object(
                'success', true,
                'message', 'Ticket assigned successfully',
                'ticket_id', ticket_id,
                'agent_id', agent_id
            ) INTO v_result;

        WHEN 'QUERY_WORKLOAD' THEN
            v_agent_id := (p_parameters->>'agent_id')::UUID;
            
            -- Get agent workload summary
            SELECT jsonb_build_object(
                'agent_summary', row_to_json(summary.*)
            ) INTO v_result
            FROM get_agent_ticket_summary(v_agent_id) summary;

        WHEN 'QUERY_METRICS' THEN
            -- Get organization metrics
            SELECT jsonb_build_object(
                'org_summary', row_to_json(summary.*)
            ) INTO v_result
            FROM get_organization_ticket_summary(p_organization_id) summary;
            
        ELSE
            v_result := jsonb_build_object(
                'error', 'Unsupported command type',
                'command_type', p_command_type
            );
    END CASE;

    -- Update the interaction with the result
    UPDATE autocrm.admin_ai_interactions
    SET result = v_result,
        status = CASE WHEN v_result ? 'error' THEN 'failed' ELSE 'success' END
    WHERE admin_id = p_admin_id
    AND created_at = (SELECT MAX(created_at) FROM autocrm.admin_ai_interactions WHERE admin_id = p_admin_id);

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes
CREATE INDEX idx_admin_ai_interactions_admin ON autocrm.admin_ai_interactions(admin_id);
CREATE INDEX idx_admin_ai_interactions_org ON autocrm.admin_ai_interactions(organization_id);
CREATE INDEX idx_admin_ai_interactions_type ON autocrm.admin_ai_interactions(command_type);
CREATE INDEX idx_admin_ai_interactions_status ON autocrm.admin_ai_interactions(status);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_ai_interactions_modtime
    BEFORE UPDATE ON autocrm.admin_ai_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON autocrm.admin_ai_interactions TO authenticated; 