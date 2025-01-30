-- Fix AI tools schema and add missing functions

-- Create analyze_customer_data function that was missing
CREATE OR REPLACE FUNCTION analyze_customer_data(
    p_customer_id UUID,
    p_analysis_type TEXT,
    p_timeframe TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Get basic customer details
    WITH customer_details AS (
        SELECT 
            c.*,
            COUNT(t.ticket_id) as total_tickets,
            AVG(CASE WHEN t.satisfaction_score IS NOT NULL THEN t.satisfaction_score END) as avg_satisfaction,
            COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved_tickets,
            COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority_tickets
        FROM customers c
        LEFT JOIN tickets t ON c.customer_id = t.customer_id
        WHERE c.customer_id = p_customer_id
        GROUP BY c.customer_id
    ),
    -- Get ticket trends
    ticket_trends AS (
        SELECT 
            DATE_TRUNC(
                CASE 
                    WHEN p_timeframe = 'daily' THEN 'day'
                    WHEN p_timeframe = 'weekly' THEN 'week'
                    WHEN p_timeframe = 'monthly' THEN 'month'
                    ELSE 'day'
                END,
                created_at
            ) as period,
            COUNT(*) as ticket_count,
            AVG(CASE WHEN satisfaction_score IS NOT NULL THEN satisfaction_score END) as period_satisfaction
        FROM tickets
        WHERE customer_id = p_customer_id
        GROUP BY 1
        ORDER BY 1 DESC
    ),
    -- Get interaction patterns
    interaction_patterns AS (
        SELECT 
            category,
            COUNT(*) as category_count,
            AVG(CASE WHEN satisfaction_score IS NOT NULL THEN satisfaction_score END) as category_satisfaction
        FROM tickets
        WHERE customer_id = p_customer_id
        GROUP BY category
    )
    SELECT 
        JSONB_BUILD_OBJECT(
            'customer_profile', (SELECT row_to_json(customer_details.*) FROM customer_details),
            'ticket_trends', (SELECT json_agg(ticket_trends.*) FROM ticket_trends),
            'interaction_patterns', (SELECT json_agg(interaction_patterns.*) FROM interaction_patterns),
            'analysis_type', p_analysis_type,
            'timeframe', p_timeframe,
            'generated_at', CURRENT_TIMESTAMP
        ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Update ticket management function to include organization validation
CREATE OR REPLACE FUNCTION manage_ticket(
    p_organization_id UUID,
    p_ticket_id UUID,
    p_action TEXT,
    p_data JSONB DEFAULT NULL
) RETURNS TABLE (
    ticket_id UUID,
    action TEXT,
    success BOOLEAN,
    message TEXT,
    updated_data JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate organization ownership
    IF NOT EXISTS (
        SELECT 1 FROM tickets 
        WHERE ticket_id = p_ticket_id 
        AND organization_id = p_organization_id
    ) THEN
        RETURN QUERY SELECT 
            p_ticket_id,
            p_action,
            false,
            'Ticket not found or not authorized',
            NULL::JSONB;
        RETURN;
    END IF;

    -- Process the action
    CASE p_action
        WHEN 'update_priority' THEN
            UPDATE tickets 
            SET 
                priority = p_data->>'priority',
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = p_ticket_id
            RETURNING 
                ticket_id,
                p_action,
                true,
                'Priority updated successfully',
                to_jsonb(tickets.*)
            INTO ticket_id, action, success, message, updated_data;
            
        WHEN 'update_status' THEN
            UPDATE tickets 
            SET 
                status = p_data->>'status',
                updated_at = CURRENT_TIMESTAMP,
                resolved_at = CASE 
                    WHEN p_data->>'status' = 'resolved' THEN CURRENT_TIMESTAMP
                    ELSE resolved_at
                END
            WHERE ticket_id = p_ticket_id
            RETURNING 
                ticket_id,
                p_action,
                true,
                'Status updated successfully',
                to_jsonb(tickets.*)
            INTO ticket_id, action, success, message, updated_data;
            
        WHEN 'reassign' THEN
            UPDATE tickets 
            SET 
                agent_id = (p_data->>'agent_id')::UUID,
                updated_at = CURRENT_TIMESTAMP,
                assigned_at = CURRENT_TIMESTAMP
            WHERE ticket_id = p_ticket_id
            RETURNING 
                ticket_id,
                p_action,
                true,
                'Ticket reassigned successfully',
                to_jsonb(tickets.*)
            INTO ticket_id, action, success, message, updated_data;
            
        ELSE
            RETURN QUERY SELECT 
                p_ticket_id,
                p_action,
                false,
                'Invalid action specified',
                NULL::JSONB;
            RETURN;
    END CASE;
    
    RETURN QUERY SELECT ticket_id, action, success, message, updated_data;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION analyze_customer_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION manage_ticket(UUID, UUID, TEXT, JSONB) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_customer_analysis 
ON tickets (customer_id, created_at, status, priority, satisfaction_score);

CREATE INDEX IF NOT EXISTS idx_tickets_organization_lookup 
ON tickets (organization_id, ticket_id); 