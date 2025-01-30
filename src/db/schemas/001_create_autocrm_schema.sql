-- Create AutoCRM Schema
CREATE SCHEMA IF NOT EXISTS autocrm;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create Tables
CREATE TABLE autocrm.agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL CHECK (role IN ('CLASSIFIER', 'RESOLVER', 'SUPERVISOR')),
    organization_id UUID NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE autocrm.workflow_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    ticket_id UUID NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    final_state VARCHAR(50),
    requires_human_intervention BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE autocrm.agent_actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES autocrm.agents(agent_id),
    session_id UUID REFERENCES autocrm.workflow_sessions(session_id),
    role VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    confidence FLOAT NOT NULL,
    latency_ms INTEGER NOT NULL,
    state VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE autocrm.knowledge_articles (
    article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE autocrm.tickets (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    customer_priority VARCHAR(50),
    category VARCHAR(100),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL,
    assigned_to UUID,
    response TEXT,
    response_quality JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX idx_agent_actions_session ON autocrm.agent_actions(session_id);
CREATE INDEX idx_agent_actions_agent ON autocrm.agent_actions(agent_id);
CREATE INDEX idx_agent_actions_type ON autocrm.agent_actions(action_type);
CREATE INDEX idx_knowledge_articles_category ON autocrm.knowledge_articles(category);
CREATE INDEX idx_tickets_status ON autocrm.tickets(status);
CREATE INDEX idx_tickets_priority ON autocrm.tickets(priority);
CREATE INDEX idx_tickets_category ON autocrm.tickets(category);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_articles(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category VARCHAR(100),
    tags TEXT[],
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        article_id,
        title,
        content,
        category,
        tags,
        1 - (embedding <=> query_embedding) as similarity
    FROM autocrm.knowledge_articles
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Create workflow metrics function
CREATE OR REPLACE FUNCTION get_workflow_metrics(
    org_id UUID,
    start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    average_completion_time FLOAT,
    success_rate FLOAT,
    escalation_rate FLOAT,
    automation_rate FLOAT,
    bottlenecks TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_sessions INT;
    completed_sessions INT;
    escalated_sessions INT;
    automated_sessions INT;
BEGIN
    -- Get session counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE end_time IS NOT NULL),
        COUNT(*) FILTER (WHERE final_state = 'ESCALATED'),
        COUNT(*) FILTER (WHERE NOT requires_human_intervention)
    INTO total_sessions, completed_sessions, escalated_sessions, automated_sessions
    FROM autocrm.workflow_sessions
    WHERE organization_id = org_id
    AND created_at BETWEEN start_time AND end_time;

    -- Calculate metrics
    RETURN QUERY
    WITH metrics AS (
        SELECT
            AVG(EXTRACT(EPOCH FROM (end_time - start_time)))::FLOAT as avg_completion_time,
            (completed_sessions::FLOAT / NULLIF(total_sessions, 0))::FLOAT as success_rate,
            (escalated_sessions::FLOAT / NULLIF(total_sessions, 0))::FLOAT as escalation_rate,
            (automated_sessions::FLOAT / NULLIF(total_sessions, 0))::FLOAT as automation_rate,
            ARRAY(
                SELECT state
                FROM (
                    SELECT 
                        state,
                        COUNT(*) as state_count,
                        AVG(latency_ms) as avg_latency
                    FROM autocrm.agent_actions aa
                    JOIN autocrm.workflow_sessions ws ON aa.session_id = ws.session_id
                    WHERE ws.organization_id = org_id
                    AND aa.created_at BETWEEN start_time AND end_time
                    GROUP BY state
                    HAVING COUNT(*) > 10 AND AVG(latency_ms) > 30000
                    ORDER BY avg_latency DESC
                    LIMIT 5
                ) bottleneck_states
            ) as bottlenecks
    )
    SELECT * FROM metrics;
END;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON autocrm.agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON autocrm.workflow_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON autocrm.knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON autocrm.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 