-- Add assigned_at timestamp to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance on agent_id
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets(agent_id);

-- Add trigger to update assigned_at timestamp when agent_id changes
DROP TRIGGER IF EXISTS update_ticket_assigned_at_timestamp ON tickets;

CREATE OR REPLACE FUNCTION update_ticket_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agent_id IS DISTINCT FROM OLD.agent_id THEN
        NEW.assigned_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ticket_assigned_at_timestamp
    BEFORE UPDATE OF agent_id ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_assigned_at();

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_members (
    team_member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(team_id) NOT NULL,
    agent_id UUID REFERENCES agents(agent_id) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, agent_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agent_id ON team_members(agent_id); 