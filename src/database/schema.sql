-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations Table
CREATE TABLE organizations (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teams Table
CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents Table
CREATE TABLE agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    avatar_url TEXT
);

-- Tickets Table
CREATE TABLE tickets (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(team_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('New', 'In Progress', 'Resolved', 'Closed')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactions Table
CREATE TABLE interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(agent_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('Email', 'Chat', 'Phone')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom Fields Table
CREATE TABLE custom_fields (
    custom_field_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT NOT NULL
);

-- Tags Table
CREATE TABLE tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Ticket Tags Table
CREATE TABLE ticket_tags (
    ticket_id UUID REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, tag_id)
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_agents_organization_id ON agents(organization_id);
CREATE INDEX idx_agents_team_id ON agents(team_id);
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_agent_id ON tickets(agent_id);
CREATE INDEX idx_tickets_team_id ON tickets(team_id);
CREATE INDEX idx_interactions_ticket_id ON interactions(ticket_id);
CREATE INDEX idx_custom_fields_ticket_id ON custom_fields(ticket_id);
CREATE INDEX idx_ticket_tags_ticket_id ON ticket_tags(ticket_id);
CREATE INDEX idx_ticket_tags_tag_id ON ticket_tags(tag_id);

-- Additional Features (Can be run separately)
-- ==========================================

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    settings_key VARCHAR(100) NOT NULL,
    settings_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for system settings
CREATE INDEX IF NOT EXISTS idx_system_settings_org ON system_settings(organization_id);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email templates
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);

-- Add private flag to interactions
ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Add contact preferences to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS contact_preferences JSONB DEFAULT '{"email": true, "phone": true}',
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"ticket_updates": true, "marketing": false}';

-- Update ticket status to include 'Assigned'
ALTER TABLE tickets 
DROP CONSTRAINT IF EXISTS tickets_status_check;

ALTER TABLE tickets 
ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('New', 'Assigned', 'In Progress', 'Resolved', 'Closed'));

-- Create updated_at triggers for new tables
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Additional Schema Enhancements (Can be run separately)
-- =================================================

-- Enable extensions needed for enhanced search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add satisfaction score to tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5);

-- Update interaction types to include Notes
ALTER TABLE interactions 
DROP CONSTRAINT IF EXISTS interactions_interaction_type_check;

ALTER TABLE interactions 
ADD CONSTRAINT interactions_interaction_type_check 
CHECK (interaction_type IN ('Email', 'Chat', 'Phone', 'Note'));

-- Add default settings trigger for new organizations
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_settings (organization_id, settings_key, settings_value)
  VALUES 
    (NEW.organization_id, 'default_priority', '"Medium"'),
    (NEW.organization_id, 'working_hours', '{"start": "09:00", "end": "17:00", "timezone": "UTC", "workdays": [1,2,3,4,5]}'),
    (NEW.organization_id, 'sla_settings', '{"low": 48, "medium": 24, "high": 8, "urgent": 4}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_org_settings ON organizations;

CREATE TRIGGER create_org_settings
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION create_default_settings();

-- Add validation for customer contact preferences
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS valid_contact_preferences;

ALTER TABLE customers
ADD CONSTRAINT valid_contact_preferences
CHECK (
  jsonb_typeof(contact_preferences) = 'object' AND 
  contact_preferences ? 'email' AND 
  contact_preferences ? 'phone'
);

-- Add validation for customer notification settings
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS valid_notification_settings;

ALTER TABLE customers
ADD CONSTRAINT valid_notification_settings
CHECK (
  jsonb_typeof(notification_settings) = 'object' AND 
  notification_settings ? 'ticket_updates' AND 
  notification_settings ? 'marketing'
);

-- Add unique constraint for email templates
ALTER TABLE email_templates
DROP CONSTRAINT IF EXISTS unique_template_name_per_org;

ALTER TABLE email_templates
ADD CONSTRAINT unique_template_name_per_org 
UNIQUE (organization_id, name);

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_contact_prefs 
ON customers USING gin (contact_preferences);

CREATE INDEX IF NOT EXISTS idx_customer_notification_settings 
ON customers USING gin (notification_settings);

CREATE INDEX IF NOT EXISTS idx_system_settings_key 
ON system_settings (settings_key);

CREATE INDEX IF NOT EXISTS idx_customer_name_search 
ON customers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customer_email_search 
ON customers USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ticket_satisfaction 
ON tickets (satisfaction_score);

CREATE INDEX IF NOT EXISTS idx_email_templates_active 
ON email_templates (is_active);

-- Add updated_at trigger for tickets satisfaction score updates
CREATE OR REPLACE FUNCTION update_ticket_satisfaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.satisfaction_score IS DISTINCT FROM OLD.satisfaction_score THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ticket_satisfaction_timestamp ON tickets;

CREATE TRIGGER update_ticket_satisfaction_timestamp
    BEFORE UPDATE OF satisfaction_score ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_satisfaction();

-- Additional Report Schema Enhancements
-- ==================================

-- Add organization_id to tickets for direct querying in reports
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE;

-- Add index for report queries
CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON tickets(organization_id);

-- Add trigger to automatically set organization_id from customer
CREATE OR REPLACE FUNCTION set_ticket_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT organization_id INTO NEW.organization_id
    FROM customers
    WHERE customer_id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_org_id ON tickets;

CREATE TRIGGER set_ticket_org_id
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_organization_id();

-- Additional Schema Enhancements for Advanced Features
-- =================================================

-- Response Templates and Macros
CREATE TABLE IF NOT EXISTS response_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    is_macro BOOLEAN DEFAULT false,
    shortcut VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Skills and Expertise
CREATE TABLE IF NOT EXISTS agent_skills (
    skill_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    skill_name VARCHAR(50) NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_articles (
    article_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    tags TEXT[],
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent Performance Metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Routing Rules
CREATE TABLE IF NOT EXISTS routing_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team Schedules
CREATE TABLE IF NOT EXISTS team_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot Configurations
CREATE TABLE IF NOT EXISTS chatbot_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Self-Service Tutorials
CREATE TABLE IF NOT EXISTS tutorials (
    tutorial_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    steps JSONB NOT NULL,
    category VARCHAR(50),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX idx_response_templates_org ON response_templates(organization_id);
CREATE INDEX idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX idx_knowledge_articles_org ON knowledge_articles(organization_id);
CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_id);
CREATE INDEX idx_routing_rules_org ON routing_rules(organization_id);
CREATE INDEX idx_team_schedules_team ON team_schedules(team_id);
CREATE INDEX idx_customer_feedback_ticket ON customer_feedback(ticket_id);
CREATE INDEX idx_chatbot_configs_org ON chatbot_configs(organization_id);
CREATE INDEX idx_tutorials_org ON tutorials(organization_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_response_templates_updated_at
    BEFORE UPDATE ON response_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_skills_updated_at
    BEFORE UPDATE ON agent_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_updated_at
    BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at
    BEFORE UPDATE ON routing_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_schedules_updated_at
    BEFORE UPDATE ON team_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbot_configs_updated_at
    BEFORE UPDATE ON chatbot_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorials_updated_at
    BEFORE UPDATE ON tutorials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add extensions for performance and search
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- For faster indexing
CREATE EXTENSION IF NOT EXISTS btree_gist; -- For range queries 

-- Ticket Attachments Table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for ticket attachments
CREATE INDEX idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);

-- Create ticket notifications table
CREATE TABLE IF NOT EXISTS ticket_notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    interaction_id UUID REFERENCES interactions(interaction_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, interaction_id)
);

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_customer 
ON ticket_notifications(customer_id, is_read);

-- Create index for ticket lookups
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_ticket 
ON ticket_notifications(ticket_id);

-- Add trigger function to create notifications
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for new interactions from agents
    IF NEW.agent_id IS NOT NULL THEN
        INSERT INTO ticket_notifications (
            ticket_id,
            customer_id,
            interaction_id,
            content
        )
        SELECT 
            NEW.ticket_id,
            t.customer_id,
            NEW.interaction_id,
            CASE 
                WHEN NEW.interaction_type = 'Status' THEN 'Ticket status updated to: ' || NEW.content
                WHEN NEW.interaction_type = 'Assignment' THEN 'Ticket assigned to new agent'
                ELSE 'New response from agent'
            END
        FROM tickets t
        WHERE t.ticket_id = NEW.ticket_id
        ON CONFLICT (ticket_id, interaction_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new interactions
DROP TRIGGER IF EXISTS trigger_create_notification ON interactions;
CREATE TRIGGER trigger_create_notification
    AFTER INSERT ON interactions
    FOR EACH ROW
    EXECUTE FUNCTION create_ticket_notification();

ALTER TABLE organizations ADD COLUMN customer_code VARCHAR(10), ADD COLUMN agent_code VARCHAR(10);
UPDATE organizations SET customer_code = 'CUS' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7)), agent_code = 'AGT' || 
UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7)) WHERE customer_code IS NULL OR agent_code IS NULL;
ALTER TABLE organizations ALTER COLUMN customer_code SET NOT NULL, ALTER COLUMN agent_code SET NOT NULL;

-- Create trigger function for updated_at timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    interaction_id UUID NOT NULL REFERENCES interactions(interaction_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_interaction_id ON attachments(interaction_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_timestamp ON attachments;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Knowledge Base PDF Attachments Support
-- ====================================

-- Add PDF attachment columns to knowledge_articles
ALTER TABLE knowledge_articles
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_filename TEXT,
ADD COLUMN IF NOT EXISTS pdf_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS pdf_last_modified TIMESTAMP WITH TIME ZONE;

-- Create article-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('article-attachments', 'article-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Remove any existing article attachment policies
DROP POLICY IF EXISTS "Article Attachments Policy" ON storage.objects;

-- Create policy for article attachments
CREATE POLICY "Article Attachments Policy" ON storage.objects
FOR ALL USING (
    bucket_id = 'article-attachments'
    AND auth.role() = 'authenticated'
) WITH CHECK (
    bucket_id = 'article-attachments'
    AND auth.role() = 'authenticated'
);

-- Create index for PDF URL
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_pdf ON knowledge_articles(pdf_url);

-- Add trigger to update pdf_last_modified
CREATE OR REPLACE FUNCTION update_pdf_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pdf_url IS DISTINCT FROM OLD.pdf_url THEN
        NEW.pdf_last_modified = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_articles_pdf_modified
    BEFORE UPDATE ON knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_last_modified();

-- Add cascade delete trigger for PDF files
CREATE OR REPLACE FUNCTION delete_pdf_file()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pdf_url IS NOT NULL THEN
        -- Delete the file from storage when the article is deleted
        DELETE FROM storage.objects
        WHERE bucket_id = 'article-attachments'
        AND name = OLD.pdf_url;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_knowledge_article_pdf
    BEFORE DELETE ON knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION delete_pdf_file();