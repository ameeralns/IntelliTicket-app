-- Create indexes for agent intelligence metrics
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_metrics_agent 
    ON agent_intelligence_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_metrics_ticket 
    ON agent_intelligence_metrics(ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_metrics_tool 
    ON agent_intelligence_metrics(tool_type);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_metrics_created 
    ON agent_intelligence_metrics(created_at);

-- Create indexes for chat drafts
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_chat_drafts_ticket 
    ON agent_intelligence_chat_drafts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_chat_drafts_agent 
    ON agent_intelligence_chat_drafts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_chat_drafts_status 
    ON agent_intelligence_chat_drafts(status);

-- Create indexes for knowledge drafts
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_knowledge_drafts_agent 
    ON agent_intelligence_knowledge_drafts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_intelligence_knowledge_drafts_status 
    ON agent_intelligence_knowledge_drafts(status);

-- Grant permissions safely
DO $$ 
BEGIN
    -- Grant table permissions
    IF EXISTS (
        SELECT FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_intelligence_metrics'
    ) THEN
        GRANT SELECT, INSERT, UPDATE ON agent_intelligence_metrics TO authenticated;
    END IF;

    IF EXISTS (
        SELECT FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_intelligence_chat_drafts'
    ) THEN
        GRANT SELECT, INSERT, UPDATE ON agent_intelligence_chat_drafts TO authenticated;
    END IF;

    IF EXISTS (
        SELECT FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_intelligence_knowledge_drafts'
    ) THEN
        GRANT SELECT, INSERT, UPDATE ON agent_intelligence_knowledge_drafts TO authenticated;
    END IF;

    -- Grant function permissions
    IF EXISTS (
        SELECT FROM pg_catalog.pg_proc 
        WHERE proname = 'create_agent_intelligence_chat_draft'
    ) THEN
        GRANT EXECUTE ON FUNCTION create_agent_intelligence_chat_draft TO authenticated;
    END IF;

    IF EXISTS (
        SELECT FROM pg_catalog.pg_proc 
        WHERE proname = 'create_agent_intelligence_knowledge_draft'
    ) THEN
        GRANT EXECUTE ON FUNCTION create_agent_intelligence_knowledge_draft TO authenticated;
    END IF;

    IF EXISTS (
        SELECT FROM pg_catalog.pg_proc 
        WHERE proname = 'get_agent_intelligence_customer_context'
    ) THEN
        GRANT EXECUTE ON FUNCTION get_agent_intelligence_customer_context TO authenticated;
    END IF;
END $$; 