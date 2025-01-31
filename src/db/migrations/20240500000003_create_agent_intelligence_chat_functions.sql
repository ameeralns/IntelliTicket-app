-- src/db/migrations/20240500000003_create_agent_intelligence_chat_functions.sql

-- Function to publish chat draft as interaction
CREATE OR REPLACE FUNCTION publish_agent_intelligence_chat_draft(
    p_draft_id uuid,
    p_agent_id uuid,
    p_is_private boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    v_interaction_id uuid;
    v_draft record;
    v_customer_id uuid;
BEGIN
    -- Parameter validation
    IF p_draft_id IS NULL OR p_agent_id IS NULL THEN
        RAISE EXCEPTION 'Required parameters cannot be null';
    END IF;

    -- Get draft details
    SELECT * INTO v_draft
    FROM agent_intelligence_chat_drafts
    WHERE draft_id = p_draft_id AND agent_id = p_agent_id;

    IF v_draft IS NULL THEN
        RAISE EXCEPTION 'Chat draft not found or unauthorized';
    END IF;

    -- Get customer_id from ticket
    SELECT customer_id INTO v_customer_id
    FROM tickets
    WHERE ticket_id = v_draft.ticket_id;

    -- Create interaction
    INSERT INTO interactions (
        interaction_id,
        ticket_id,
        agent_id,
        customer_id,
        content,
        interaction_type,
        is_private,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_draft.ticket_id,
        p_agent_id,
        v_customer_id,
        v_draft.content,
        'ai_assisted',
        p_is_private,
        CURRENT_TIMESTAMP
    ) RETURNING interaction_id INTO v_interaction_id;

    -- Update draft status
    UPDATE agent_intelligence_chat_drafts
    SET 
        status = 'published',
        applied_at = CURRENT_TIMESTAMP
    WHERE draft_id = p_draft_id;

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
        v_draft.organization_id,
        'chat_interaction',
        v_draft.ticket_id,
        true,
        jsonb_build_object(
            'draft_id', p_draft_id,
            'interaction_id', v_interaction_id,
            'knowledge_sources', v_draft.knowledge_sources
        )
    );

    RETURN v_interaction_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error metric
        IF v_draft.organization_id IS NOT NULL THEN
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
                v_draft.organization_id,
                'chat_interaction',
                v_draft.ticket_id,
                false,
                SQLERRM,
                SQLSTATE
            );
        END IF;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to reject chat draft
CREATE OR REPLACE FUNCTION reject_agent_intelligence_chat_draft(
    p_draft_id uuid,
    p_agent_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_draft record;
BEGIN
    -- Get draft details
    SELECT * INTO v_draft
    FROM agent_intelligence_chat_drafts
    WHERE draft_id = p_draft_id AND agent_id = p_agent_id;

    IF v_draft IS NULL THEN
        RAISE EXCEPTION 'Chat draft not found or unauthorized';
    END IF;

    -- Update draft status
    UPDATE agent_intelligence_chat_drafts
    SET 
        status = 'rejected',
        metadata = COALESCE(metadata, '{}'::jsonb) || 
                  jsonb_build_object('rejection_reason', p_reason)
    WHERE draft_id = p_draft_id;

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
        v_draft.organization_id,
        'chat_interaction',
        v_draft.ticket_id,
        true,
        jsonb_build_object(
            'draft_id', p_draft_id,
            'action', 'reject',
            'reason', p_reason
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM pg_catalog.pg_proc 
        WHERE proname = 'publish_agent_intelligence_chat_draft'
    ) THEN
        GRANT EXECUTE ON FUNCTION publish_agent_intelligence_chat_draft TO authenticated;
    END IF;

    IF EXISTS (
        SELECT FROM pg_catalog.pg_proc 
        WHERE proname = 'reject_agent_intelligence_chat_draft'
    ) THEN
        GRANT EXECUTE ON FUNCTION reject_agent_intelligence_chat_draft TO authenticated;
    END IF;
END $$;