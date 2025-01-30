-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS autocrm.agent_actions CASCADE;
DROP TABLE IF EXISTS autocrm.workflow_sessions CASCADE;
DROP TABLE IF EXISTS autocrm.knowledge_articles CASCADE;
DROP TABLE IF EXISTS autocrm.response_templates CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS autocrm.workflow_state CASCADE;
DROP TYPE IF EXISTS autocrm.action_type CASCADE;

-- Create enum types
CREATE TYPE autocrm.workflow_state AS ENUM (
    'NEW',
    'CLASSIFIED',
    'KNOWLEDGE_SEARCHED',
    'RESPONSE_DRAFTED',
    'VALIDATED',
    'SENT',
    'RESOLVED',
    'ESCALATED'
);

CREATE TYPE autocrm.action_type AS ENUM (
    'UPDATE_TICKET',
    'DRAFT_RESPONSE',
    'SEARCH_KNOWLEDGE',
    'ESCALATE',
    'NOTIFY_USER'
);

-- Create workflow sessions table
CREATE TABLE IF NOT EXISTS autocrm.workflow_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    ticket_id UUID NOT NULL,
    workflow_state autocrm.workflow_state NOT NULL DEFAULT 'NEW',
    context JSONB NOT NULL DEFAULT '{}',
    requires_human_intervention BOOLEAN DEFAULT FALSE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    metadata JSONB DEFAULT '{
        "attemptCount": 0,
        "escalationCount": 0,
        "confidenceScores": [],
        "responseTimes": []
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) 
        REFERENCES public.organizations(organization_id),
    CONSTRAINT fk_ticket FOREIGN KEY (ticket_id) 
        REFERENCES public.tickets(ticket_id)
);

-- Create indexes for workflow_sessions
CREATE INDEX idx_workflow_sessions_org ON autocrm.workflow_sessions(organization_id);
CREATE INDEX idx_workflow_sessions_ticket ON autocrm.workflow_sessions(ticket_id);
CREATE INDEX idx_workflow_sessions_state ON autocrm.workflow_sessions(workflow_state);
CREATE INDEX idx_workflow_sessions_created ON autocrm.workflow_sessions(created_at);

-- Create agent actions table
CREATE TABLE IF NOT EXISTS autocrm.agent_actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    action_type autocrm.action_type NOT NULL,
    workflow_state autocrm.workflow_state NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    result JSONB NOT NULL DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT FALSE,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    latency_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_session FOREIGN KEY (session_id) 
        REFERENCES autocrm.workflow_sessions(session_id),
    CONSTRAINT fk_agent FOREIGN KEY (agent_id) 
        REFERENCES autocrm.agents(agent_id),
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) 
        REFERENCES public.organizations(organization_id)
);

-- Create indexes for agent_actions
CREATE INDEX idx_agent_actions_session ON autocrm.agent_actions(session_id);
CREATE INDEX idx_agent_actions_agent ON autocrm.agent_actions(agent_id);
CREATE INDEX idx_agent_actions_org ON autocrm.agent_actions(organization_id);
CREATE INDEX idx_agent_actions_type ON autocrm.agent_actions(action_type);
CREATE INDEX idx_agent_actions_state ON autocrm.agent_actions(workflow_state);
CREATE INDEX idx_agent_actions_created ON autocrm.agent_actions(created_at);

-- Create knowledge base table
CREATE TABLE IF NOT EXISTS autocrm.knowledge_articles (
    article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) 
        REFERENCES public.organizations(organization_id)
);

-- Create indexes for knowledge_articles
CREATE INDEX idx_knowledge_articles_org ON autocrm.knowledge_articles(organization_id);
CREATE INDEX idx_knowledge_articles_category ON autocrm.knowledge_articles(category);
CREATE INDEX idx_knowledge_articles_active ON autocrm.knowledge_articles(active);
CREATE INDEX idx_knowledge_articles_embedding ON autocrm.knowledge_articles USING ivfflat (embedding vector_cosine_ops);

-- Create response templates table
CREATE TABLE IF NOT EXISTS autocrm.response_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    variables JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) 
        REFERENCES public.organizations(organization_id)
);

-- Create indexes for response_templates
CREATE INDEX idx_response_templates_org ON autocrm.response_templates(organization_id);
CREATE INDEX idx_response_templates_category ON autocrm.response_templates(category);
CREATE INDEX idx_response_templates_active ON autocrm.response_templates(active);

-- Add triggers for updated_at
CREATE TRIGGER update_workflow_sessions_updated_at
    BEFORE UPDATE ON autocrm.workflow_sessions
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
    BEFORE UPDATE ON autocrm.knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

CREATE TRIGGER update_response_templates_updated_at
    BEFORE UPDATE ON autocrm.response_templates
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

-- Create helper functions
CREATE OR REPLACE FUNCTION autocrm.get_active_workflow_session(
    p_ticket_id UUID
)
RETURNS TABLE (
    session_id UUID,
    workflow_state autocrm.workflow_state,
    context JSONB,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.session_id,
        ws.workflow_state,
        ws.context,
        ws.metadata
    FROM autocrm.workflow_sessions ws
    WHERE ws.ticket_id = p_ticket_id
    AND ws.end_time IS NULL
    ORDER BY ws.created_at DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION autocrm.find_similar_articles(
    p_query_embedding vector(1536),
    p_organization_id UUID,
    p_similarity_threshold FLOAT DEFAULT 0.7,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    article_id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    tags TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ka.article_id,
        ka.title,
        ka.content,
        ka.category,
        ka.tags,
        1 - (ka.embedding <=> p_query_embedding) as similarity
    FROM autocrm.knowledge_articles ka
    WHERE ka.organization_id = p_organization_id
    AND ka.active = TRUE
    AND 1 - (ka.embedding <=> p_query_embedding) > p_similarity_threshold
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION autocrm.get_relevant_templates(
    p_category TEXT,
    p_organization_id UUID,
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    template_id UUID,
    name TEXT,
    content TEXT,
    variables JSONB,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.template_id,
        rt.name,
        rt.content,
        rt.variables,
        rt.metadata
    FROM autocrm.response_templates rt
    WHERE rt.organization_id = p_organization_id
    AND rt.active = TRUE
    AND rt.category = p_category
    AND (p_tags IS NULL OR rt.tags && p_tags)
    ORDER BY rt.created_at DESC;
END;
$$; 