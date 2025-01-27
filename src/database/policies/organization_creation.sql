-- First, disable RLS temporarily to allow initial setup
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS organization_creation_policy ON organizations;
DROP POLICY IF EXISTS organization_insert_policy ON organizations;
DROP POLICY IF EXISTS organization_select_policy ON organizations;
DROP POLICY IF EXISTS agent_creation_policy ON agents;
DROP POLICY IF EXISTS agent_insert_policy ON agents;
DROP POLICY IF EXISTS agent_select_policy ON agents;
DROP POLICY IF EXISTS agent_update_policy ON agents;
DROP POLICY IF EXISTS system_settings_creation_policy ON system_settings;
DROP POLICY IF EXISTS system_settings_insert_policy ON system_settings;
DROP POLICY IF EXISTS system_settings_select_policy ON system_settings;

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Organization Policies
CREATE POLICY organization_anon_insert ON organizations
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY organization_auth_all ON organizations
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM agents 
            WHERE agent_id = auth.uid()
        )
    );

-- Agent Policies
CREATE POLICY agent_anon_insert ON agents
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY agent_auth_all ON agents
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM agents 
            WHERE agent_id = auth.uid()
        )
    );

-- System Settings Policies
CREATE POLICY settings_anon_insert ON system_settings
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY settings_auth_all ON system_settings
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM agents 
            WHERE agent_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON organizations TO anon;
GRANT ALL ON organizations TO authenticated;

GRANT ALL ON agents TO anon;
GRANT ALL ON agents TO authenticated;

GRANT ALL ON system_settings TO anon;
GRANT ALL ON system_settings TO authenticated; 