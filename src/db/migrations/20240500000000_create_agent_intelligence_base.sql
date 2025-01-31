-- Create enums for agent intelligence
DO $$ 
BEGIN
    -- Drop existing types if they exist
    DROP TYPE IF EXISTS agent_intelligence_content_status;
    DROP TYPE IF EXISTS agent_intelligence_tool_type;
    
    -- Create the types
    CREATE TYPE agent_intelligence_tool_type AS ENUM (
        'chat_interaction',
        'customer_info',
        'knowledge_creation'
    );

    CREATE TYPE agent_intelligence_content_status AS ENUM (
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'published'
    );
END $$;

-- Create table for agent intelligence metrics
CREATE TABLE IF NOT EXISTS agent_intelligence_metrics (
    metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES agents(agent_id),
    organization_id uuid NOT NULL REFERENCES organizations(organization_id),
    tool_type agent_intelligence_tool_type NOT NULL,
    ticket_id uuid REFERENCES tickets(ticket_id),
    execution_time_ms integer,
    success boolean NOT NULL DEFAULT false,
    error_type text,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_intelligence_metrics_org
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(organization_id) ON DELETE CASCADE
);

-- Create table for agent intelligence chat drafts
CREATE TABLE IF NOT EXISTS agent_intelligence_chat_drafts (
    draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(ticket_id),
    agent_id uuid NOT NULL REFERENCES agents(agent_id),
    organization_id uuid NOT NULL REFERENCES organizations(organization_id),
    content text NOT NULL,
    knowledge_sources jsonb,
    context_messages jsonb,
    confidence_score float,
    status agent_intelligence_content_status NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    applied_at timestamp with time zone,
    CONSTRAINT fk_agent_intelligence_chat_drafts_ticket
        FOREIGN KEY (ticket_id) 
        REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_intelligence_chat_drafts_agent
        FOREIGN KEY (agent_id)
        REFERENCES agents(agent_id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_intelligence_chat_drafts_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id) ON DELETE CASCADE
);

-- Create table for knowledge article drafts
CREATE TABLE IF NOT EXISTS agent_intelligence_knowledge_drafts (
    draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid NOT NULL REFERENCES agents(agent_id),
    organization_id uuid NOT NULL REFERENCES organizations(organization_id),
    title text NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    suggested_tags text[],
    source_ticket_ids uuid[],
    status agent_intelligence_content_status NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    published_article_id uuid REFERENCES knowledge_articles(article_id),
    metadata jsonb,
    CONSTRAINT fk_agent_intelligence_knowledge_drafts_agent
        FOREIGN KEY (agent_id)
        REFERENCES agents(agent_id) ON DELETE CASCADE,
    CONSTRAINT fk_agent_intelligence_knowledge_drafts_org
        FOREIGN KEY (organization_id)
        REFERENCES organizations(organization_id) ON DELETE CASCADE
); 