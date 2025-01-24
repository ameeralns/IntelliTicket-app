-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM agents 
    WHERE agent_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM agents 
    WHERE agent_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations table policies
CREATE POLICY admin_org_access ON organizations
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Teams table policies
CREATE POLICY admin_teams_access ON teams
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Agents table policies
CREATE POLICY admin_agents_access ON agents
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Customers table policies
CREATE POLICY admin_customers_access ON customers
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Tickets table policies
CREATE POLICY admin_tickets_access ON tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.customer_id = tickets.customer_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.customer_id = tickets.customer_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  );

-- Interactions table policies
CREATE POLICY admin_interactions_access ON interactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = interactions.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = interactions.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  );

-- Custom fields table policies
CREATE POLICY admin_custom_fields_access ON custom_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = custom_fields.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = custom_fields.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  );

-- Tags table policies
CREATE POLICY admin_tags_access ON tags
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Ticket tags table policies
CREATE POLICY admin_ticket_tags_access ON ticket_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = ticket_tags.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN customers c ON t.customer_id = c.customer_id
      WHERE t.ticket_id = ticket_tags.ticket_id
      AND c.organization_id = get_user_org_id()
      AND is_admin()
    )
  );

-- System settings table policies
CREATE POLICY admin_settings_access ON system_settings
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Email templates table policies
CREATE POLICY admin_email_templates_access ON email_templates
  FOR ALL
  TO authenticated
  USING (
    organization_id = get_user_org_id() 
    AND is_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND is_admin()
  );

-- Drop any conflicting policies
DO $$ 
BEGIN
  -- List of tables to check
  DECLARE
    tables text[] := ARRAY[
      'organizations', 'teams', 'agents', 'customers', 'tickets',
      'interactions', 'custom_fields', 'tags', 'ticket_tags',
      'system_settings', 'email_templates'
    ];
    t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation_policy ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_read_policy ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write_policy ON %I', t, t);
  END LOOP;
END;
END $$;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh the RLS policies
DO $$ 
BEGIN
  -- List of tables to refresh
  DECLARE
    tables text[] := ARRAY[
      'organizations', 'teams', 'agents', 'customers', 'tickets',
      'interactions', 'custom_fields', 'tags', 'ticket_tags',
      'system_settings', 'email_templates'
    ];
    t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
END $$; 