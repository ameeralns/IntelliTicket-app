-- Create required tables for AI tools

-- Create automation rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS automation_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    name TEXT NOT NULL,
    condition_expression TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_parameters JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SLA policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS sla_policies (
    policy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    name TEXT NOT NULL,
    priority TEXT NOT NULL,
    response_time_threshold INTERVAL NOT NULL,
    resolution_time_threshold INTERVAL NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_rules_org ON automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_policies_org ON sla_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_status ON tickets(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_team_metrics ON tickets(agent_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS set_automation_rules_timestamp ON automation_rules;
CREATE TRIGGER set_automation_rules_timestamp
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sla_policies_timestamp ON sla_policies;
CREATE TRIGGER set_sla_policies_timestamp
    BEFORE UPDATE ON sla_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 