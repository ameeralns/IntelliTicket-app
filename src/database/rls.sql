-- Step 1: Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;

-- Create an auth helper function to get the current user's organization_id
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS UUID AS $$
BEGIN
  -- Get organization_id from agents or customers table based on auth.uid()
  RETURN (
    SELECT organization_id 
    FROM (
      SELECT organization_id FROM agents WHERE agent_id = auth.uid()
      UNION
      SELECT organization_id FROM customers WHERE customer_id = auth.uid()
    ) AS user_org 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an auth helper function to get the current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM agents 
    WHERE agent_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an auth helper function to check if user is an admin
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

-- Step 2: Organization Isolation Policies

-- Organizations table policies
CREATE POLICY organization_isolation_policy ON organizations
    FOR ALL
    USING (organization_id = get_current_user_org_id());

-- Teams table policies
CREATE POLICY teams_isolation_policy ON teams
    FOR ALL
    USING (organization_id = get_current_user_org_id());

-- Agents table policies
CREATE POLICY agents_isolation_policy ON agents
    FOR ALL
    USING (organization_id = get_current_user_org_id());

-- Customers table policies
CREATE POLICY customers_isolation_policy ON customers
    FOR ALL
    USING (organization_id = get_current_user_org_id());

-- Tickets table policies
CREATE POLICY tickets_isolation_policy ON tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.customer_id = tickets.customer_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Interactions table policies
CREATE POLICY interactions_isolation_policy ON interactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = interactions.ticket_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Custom fields table policies
CREATE POLICY custom_fields_isolation_policy ON custom_fields
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = custom_fields.ticket_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Tags isolation (organization-specific tags)
CREATE POLICY tags_isolation_policy ON tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM ticket_tags tt
            JOIN tickets t ON tt.ticket_id = t.ticket_id
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE tt.tag_id = tags.tag_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Ticket tags isolation
CREATE POLICY ticket_tags_isolation_policy ON ticket_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = ticket_tags.ticket_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Step 3: Role-Based Access Policies

-- Organizations table - role-based policies
CREATE POLICY organizations_admin_policy ON organizations
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY organizations_read_policy ON organizations
    FOR SELECT
    USING (organization_id = get_current_user_org_id());

-- Teams table - role-based policies
CREATE POLICY teams_admin_policy ON teams
    FOR ALL
    USING (is_admin() AND organization_id = get_current_user_org_id())
    WITH CHECK (is_admin() AND organization_id = get_current_user_org_id());

CREATE POLICY teams_agent_read_policy ON teams
    FOR SELECT
    USING (organization_id = get_current_user_org_id());

-- Agents table - role-based policies
CREATE POLICY agents_admin_policy ON agents
    FOR ALL
    USING (is_admin() AND organization_id = get_current_user_org_id())
    WITH CHECK (is_admin() AND organization_id = get_current_user_org_id());

CREATE POLICY agents_self_read_policy ON agents
    FOR SELECT
    USING (organization_id = get_current_user_org_id());

-- Customers table - role-based policies
CREATE POLICY customers_admin_policy ON customers
    FOR ALL
    USING (is_admin() AND organization_id = get_current_user_org_id())
    WITH CHECK (is_admin() AND organization_id = get_current_user_org_id());

CREATE POLICY customers_agent_policy ON customers
    FOR SELECT
    USING (organization_id = get_current_user_org_id());

CREATE POLICY customers_self_policy ON customers
    FOR SELECT
    USING (customer_id = auth.uid());

-- Tickets table - role-based policies
CREATE POLICY tickets_admin_policy ON tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.customer_id = tickets.customer_id
            AND c.organization_id = get_current_user_org_id()
            AND is_admin()
        )
    );

CREATE POLICY tickets_agent_policy ON tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.customer_id = tickets.customer_id
            AND c.organization_id = get_current_user_org_id()
            AND (
                tickets.agent_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM agents a
                    WHERE a.agent_id = auth.uid()
                    AND a.team_id = tickets.team_id
                )
            )
        )
    );

CREATE POLICY tickets_customer_policy ON tickets
    FOR SELECT
    USING (customer_id = auth.uid());

CREATE POLICY tickets_customer_insert_policy ON tickets
    FOR INSERT
    WITH CHECK (customer_id = auth.uid());

-- Interactions table - role-based policies
CREATE POLICY interactions_admin_policy ON interactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = interactions.ticket_id
            AND c.organization_id = get_current_user_org_id()
            AND is_admin()
        )
    );

CREATE POLICY interactions_agent_policy ON interactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.ticket_id = interactions.ticket_id
            AND (
                t.agent_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM agents a
                    WHERE a.agent_id = auth.uid()
                    AND a.team_id = t.team_id
                )
            )
        )
    );

CREATE POLICY interactions_customer_policy ON interactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.ticket_id = interactions.ticket_id
            AND t.customer_id = auth.uid()
        )
    );

-- Step 4: Record-Level Policies

-- Custom fields record-level policies
CREATE POLICY custom_fields_admin_policy ON custom_fields
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = custom_fields.ticket_id
            AND c.organization_id = get_current_user_org_id()
            AND is_admin()
        )
    );

CREATE POLICY custom_fields_agent_policy ON custom_fields
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.ticket_id = custom_fields.ticket_id
            AND (
                t.agent_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM agents a
                    WHERE a.agent_id = auth.uid()
                    AND a.team_id = t.team_id
                )
            )
        )
    );

-- Tags record-level policies
CREATE POLICY tags_admin_policy ON tags
    FOR ALL
    USING (is_admin());

CREATE POLICY tags_agent_read_policy ON tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ticket_tags tt
            JOIN tickets t ON tt.ticket_id = t.ticket_id
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE tt.tag_id = tags.tag_id
            AND c.organization_id = get_current_user_org_id()
        )
    );

-- Ticket tags record-level policies
CREATE POLICY ticket_tags_admin_policy ON ticket_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN customers c ON t.customer_id = c.customer_id
            WHERE t.ticket_id = ticket_tags.ticket_id
            AND c.organization_id = get_current_user_org_id()
            AND is_admin()
        )
    );

CREATE POLICY ticket_tags_agent_policy ON ticket_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.ticket_id = ticket_tags.ticket_id
            AND (
                t.agent_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM agents a
                    WHERE a.agent_id = auth.uid()
                    AND a.team_id = t.team_id
                )
            )
        )
    );

-- Add record-level ownership checks for agents
CREATE POLICY agents_self_update_policy ON agents
    FOR UPDATE
    USING (agent_id = auth.uid());

-- Add record-level ownership checks for customers
CREATE POLICY customers_self_update_policy ON customers
    FOR UPDATE
    USING (customer_id = auth.uid());

-- Step 5: Special Case Handling

-- Add is_private column to interactions
ALTER TABLE interactions ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

-- Update interactions policies to handle private notes
DROP POLICY IF EXISTS interactions_customer_policy ON interactions;
CREATE POLICY interactions_customer_policy ON interactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.ticket_id = interactions.ticket_id
            AND t.customer_id = auth.uid()
            AND NOT interactions.is_private
        )
    );

-- Create helper function for checking if user can view private notes
CREATE OR REPLACE FUNCTION can_view_private_notes()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM agents
        WHERE agent_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for private notes visibility
CREATE POLICY interactions_private_notes_policy ON interactions
    FOR SELECT
    USING (
        CASE
            WHEN is_private THEN can_view_private_notes()
            ELSE TRUE
        END
    );

-- Create indexes for better policy performance
CREATE INDEX idx_interactions_is_private ON interactions(is_private);
CREATE INDEX idx_agents_role ON agents(role);

-- Cleanup and optimization
ANALYZE organizations;
ANALYZE teams;
ANALYZE agents;
ANALYZE customers;
ANALYZE tickets;
ANALYZE interactions;
ANALYZE custom_fields;
ANALYZE tags;
ANALYZE ticket_tags;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Organizations table with multi-tenant support';
COMMENT ON TABLE teams IS 'Teams within organizations';
COMMENT ON TABLE agents IS 'Support agents and admins';
COMMENT ON TABLE customers IS 'Customers belonging to organizations';
COMMENT ON TABLE tickets IS 'Support tickets';
COMMENT ON TABLE interactions IS 'Ticket interactions including private notes';
COMMENT ON TABLE custom_fields IS 'Custom fields for tickets';
COMMENT ON TABLE tags IS 'Tags for categorizing tickets';
COMMENT ON TABLE ticket_tags IS 'Junction table for ticket-tag relationships';

-- Add comments on RLS policies
COMMENT ON POLICY organization_isolation_policy ON organizations IS 'Ensures organizations can only access their own data';
COMMENT ON POLICY teams_isolation_policy ON teams IS 'Ensures teams can only be accessed within their organization';
COMMENT ON POLICY agents_isolation_policy ON agents IS 'Ensures agents can only be accessed within their organization';
COMMENT ON POLICY interactions_private_notes_policy ON interactions IS 'Controls visibility of private notes to agents only'; 

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Allow admins to read organizations" ON organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.agent_id = auth.uid() 
      AND agents.role = 'admin'
    )
  );

-- Teams policies
CREATE POLICY "Allow admins to read teams" ON teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.agent_id = auth.uid() 
      AND agents.role = 'admin'
    )
  );