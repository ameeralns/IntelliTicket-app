-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS autocrm.agents CASCADE;
DROP TYPE IF EXISTS autocrm.agent_role CASCADE;

-- Create agent role enum
CREATE TYPE autocrm.agent_role AS ENUM (
    'CLASSIFIER',
    'RESOLVER',
    'SUPERVISOR'
);

-- Create agents table
CREATE TABLE IF NOT EXISTS autocrm.agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    role autocrm.agent_role NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{
        "maxRetries": 3,
        "confidenceThreshold": 0.85,
        "timeoutMs": 5000
    }',
    metadata JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) 
        REFERENCES public.organizations(organization_id)
);

-- Add trigger for updated_at
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON autocrm.agents
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

-- Create indexes after table creation
CREATE INDEX idx_agents_org ON autocrm.agents(organization_id);
CREATE INDEX idx_agents_role ON autocrm.agents(role);
CREATE INDEX idx_agents_active ON autocrm.agents(active);

-- Create helper functions
CREATE OR REPLACE FUNCTION autocrm.get_active_agents(
    p_organization_id UUID,
    p_role autocrm.agent_role DEFAULT NULL
)
RETURNS TABLE (
    agent_id UUID,
    role autocrm.agent_role,
    name TEXT,
    config JSONB,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.agent_id,
        a.role,
        a.name,
        a.config,
        a.metadata
    FROM autocrm.agents a
    WHERE a.organization_id = p_organization_id
    AND a.active = TRUE
    AND (p_role IS NULL OR a.role = p_role)
    ORDER BY a.created_at DESC;
END;
$$;

-- Create function to update agent configuration
CREATE OR REPLACE FUNCTION autocrm.update_agent_config(
    p_agent_id UUID,
    p_config_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_config JSONB;
BEGIN
    -- Update config and return new value
    UPDATE autocrm.agents
    SET config = config || p_config_updates
    WHERE agent_id = p_agent_id
    RETURNING config INTO v_new_config;
    
    RETURN v_new_config;
END;
$$; 