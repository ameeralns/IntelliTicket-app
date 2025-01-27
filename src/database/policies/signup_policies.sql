-- First, disable RLS
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS service_role_organizations ON organizations;
DROP POLICY IF EXISTS service_role_agents ON agents;
DROP POLICY IF EXISTS service_role_settings ON system_settings;
DROP POLICY IF EXISTS authenticated_organizations ON organizations;
DROP POLICY IF EXISTS authenticated_agents ON agents;
DROP POLICY IF EXISTS authenticated_settings ON system_settings;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for service role
CREATE POLICY service_role_organizations ON organizations
    FOR ALL
    USING (current_user = 'service_role')
    WITH CHECK (current_user = 'service_role');

CREATE POLICY service_role_agents ON agents
    FOR ALL
    USING (current_user = 'service_role')
    WITH CHECK (current_user = 'service_role');

CREATE POLICY service_role_settings ON system_settings
    FOR ALL
    USING (current_user = 'service_role')
    WITH CHECK (current_user = 'service_role');

-- Create policies for authenticated users
CREATE POLICY authenticated_organizations ON organizations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY authenticated_agents ON agents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY authenticated_settings ON system_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant full access to service role
GRANT ALL ON organizations TO service_role;
GRANT ALL ON agents TO service_role;
GRANT ALL ON system_settings TO service_role;

-- Grant full access to authenticated users
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON agents TO authenticated;
GRANT ALL ON system_settings TO authenticated; 