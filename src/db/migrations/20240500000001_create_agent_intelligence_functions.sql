-- Function to create AI chat draft
CREATE OR REPLACE FUNCTION create_agent_intelligence_chat_draft(
    p_ticket_id uuid,
    p_agent_id uuid,
    p_content text,
    p_knowledge_sources jsonb DEFAULT NULL,
    p_context_messages jsonb DEFAULT NULL,
    p_confidence_score float DEFAULT 0.0,
    p_ticket_updates jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_draft_id uuid;
    v_organization_id uuid;
BEGIN
    -- Parameter validation
    IF p_ticket_id IS NULL OR p_agent_id IS NULL OR p_content IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Get organization_id from ticket
    SELECT organization_id 
    INTO v_organization_id
    FROM tickets 
    WHERE ticket_id = p_ticket_id;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Ticket not found or invalid';
    END IF;

    -- Update ticket if updates provided
    IF p_ticket_updates IS NOT NULL AND p_ticket_updates != '{}'::jsonb THEN
        UPDATE tickets
        SET
            status = COALESCE((p_ticket_updates->>'status')::text, status),
            priority = COALESCE((p_ticket_updates->>'priority')::text, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE ticket_id = p_ticket_id;
    END IF;

    -- Create chat draft
    INSERT INTO agent_intelligence_chat_drafts (
        ticket_id,
        agent_id,
        organization_id,
        content,
        knowledge_sources,
        context_messages,
        confidence_score,
        metadata
    ) VALUES (
        p_ticket_id,
        p_agent_id,
        v_organization_id,
        p_content,
        p_knowledge_sources,
        p_context_messages,
        p_confidence_score,
        CASE 
            WHEN p_ticket_updates IS NOT NULL AND p_ticket_updates != '{}'::jsonb 
            THEN jsonb_build_object('ticket_updates', p_ticket_updates)
            ELSE NULL
        END
    ) RETURNING draft_id INTO v_draft_id;

    -- Log metric
    INSERT INTO agent_intelligence_metrics (
        agent_id,
        organization_id,
        tool_type,
        ticket_id,
        success,
        metadata
    ) VALUES (
        p_agent_id,
        v_organization_id,
        'chat_interaction',
        p_ticket_id,
        true,
        jsonb_build_object(
            'draft_id', v_draft_id,
            'knowledge_sources', p_knowledge_sources,
            'ticket_updates', p_ticket_updates
        )
    );

    RETURN v_draft_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error metric
        IF v_organization_id IS NOT NULL THEN
            INSERT INTO agent_intelligence_metrics (
                agent_id,
                organization_id,
                tool_type,
                ticket_id,
                success,
                error_type,
                error_message
            ) VALUES (
                p_agent_id,
                v_organization_id,
                'chat_interaction',
                p_ticket_id,
                false,
                SQLERRM,
                SQLSTATE
            );
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to create knowledge article draft
CREATE OR REPLACE FUNCTION create_agent_intelligence_knowledge_draft(
    p_agent_id uuid,
    p_title text,
    p_content text,
    p_category text,
    p_suggested_tags text[],
    p_source_ticket_ids uuid[],
    p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_draft_id uuid;
    v_organization_id uuid;
BEGIN
    -- Parameter validation
    IF p_agent_id IS NULL OR p_title IS NULL OR p_content IS NULL OR p_category IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Get organization_id from agent
    SELECT organization_id 
    INTO v_organization_id
    FROM agents 
    WHERE agent_id = p_agent_id;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Agent not found or invalid';
    END IF;

    -- Create knowledge draft
    INSERT INTO agent_intelligence_knowledge_drafts (
        agent_id,
        organization_id,
        title,
        content,
        category,
        suggested_tags,
        source_ticket_ids,
        metadata
    ) VALUES (
        p_agent_id,
        v_organization_id,
        p_title,
        p_content,
        p_category,
        p_suggested_tags,
        p_source_ticket_ids,
        p_metadata
    ) RETURNING draft_id INTO v_draft_id;

    -- Log metric
    INSERT INTO agent_intelligence_metrics (
        agent_id,
        organization_id,
        tool_type,
        success,
        metadata
    ) VALUES (
        p_agent_id,
        v_organization_id,
        'knowledge_creation',
        true,
        jsonb_build_object(
            'draft_id', v_draft_id,
            'source_tickets', p_source_ticket_ids
        )
    );

    RETURN v_draft_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error metric
        IF v_organization_id IS NOT NULL THEN
            INSERT INTO agent_intelligence_metrics (
                agent_id,
                organization_id,
                tool_type,
                success,
                error_type,
                error_message
            ) VALUES (
                p_agent_id,
                v_organization_id,
                'knowledge_creation',
                false,
                SQLERRM,
                SQLSTATE
            );
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer context
CREATE OR REPLACE FUNCTION get_agent_intelligence_customer_context(
    p_agent_id uuid,
    p_ticket_ids uuid[]
)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Parameter validation
    IF p_agent_id IS NULL OR p_ticket_ids IS NULL OR array_length(p_ticket_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Required parameters cannot be null or empty';
    END IF;

    WITH ticket_customers AS (
        SELECT DISTINCT t.customer_id
        FROM tickets t
        WHERE t.ticket_id = ANY(p_ticket_ids)
        AND t.agent_id = p_agent_id
    )
    SELECT jsonb_build_object(
        'customers', jsonb_agg(
            jsonb_build_object(
                'customer_id', c.customer_id,
                'name', c.name,
                'email', c.email,
                'phone', c.phone,
                'tickets', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'ticket_id', t.ticket_id,
                            'title', t.title,
                            'status', t.status,
                            'created_at', t.created_at
                        )
                    )
                    FROM tickets t
                    WHERE t.customer_id = c.customer_id
                    AND t.agent_id = p_agent_id
                    ORDER BY t.created_at DESC
                    LIMIT 5
                )
            )
        )
    ) INTO v_result
    FROM ticket_customers tc
    JOIN customers c ON c.customer_id = tc.customer_id;

    RETURN COALESCE(v_result, jsonb_build_object('customers', '[]'::jsonb));
END;
$$ LANGUAGE plpgsql; 