-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create AutoCRM schema
CREATE SCHEMA IF NOT EXISTS autocrm;

-- AutoCRM Actions Table
CREATE TABLE autocrm.actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(agent_id),
    action_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    changes JSONB NOT NULL,
    previous_state JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AutoCRM Sessions Table
CREATE TABLE autocrm.sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(agent_id),
    user_id UUID NOT NULL,
    start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'timeout')),
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AutoCRM Feedback Table
CREATE TABLE autocrm.feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES autocrm.actions(action_id) ON DELETE CASCADE,
    session_id UUID REFERENCES autocrm.sessions(session_id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_autocrm_actions_org ON autocrm.actions(organization_id);
CREATE INDEX idx_autocrm_actions_agent ON autocrm.actions(agent_id);
CREATE INDEX idx_autocrm_actions_target ON autocrm.actions(target_table, target_id);
CREATE INDEX idx_autocrm_actions_status ON autocrm.actions(status);
CREATE INDEX idx_autocrm_actions_created ON autocrm.actions(created_at);

CREATE INDEX idx_autocrm_sessions_org ON autocrm.sessions(organization_id);
CREATE INDEX idx_autocrm_sessions_agent ON autocrm.sessions(agent_id);
CREATE INDEX idx_autocrm_sessions_user ON autocrm.sessions(user_id);
CREATE INDEX idx_autocrm_sessions_status ON autocrm.sessions(status);
CREATE INDEX idx_autocrm_sessions_time ON autocrm.sessions(start_time, end_time);

CREATE INDEX idx_autocrm_feedback_action ON autocrm.feedback(action_id);
CREATE INDEX idx_autocrm_feedback_session ON autocrm.feedback(session_id);
CREATE INDEX idx_autocrm_feedback_rating ON autocrm.feedback(rating);

-- Add triggers for updated_at columns
CREATE TRIGGER update_autocrm_actions_updated_at
    BEFORE UPDATE ON autocrm.actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_autocrm_sessions_updated_at
    BEFORE UPDATE ON autocrm.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE autocrm.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autocrm.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autocrm.feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for actions
CREATE POLICY actions_org_access ON autocrm.actions
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Create policies for sessions
CREATE POLICY sessions_org_access ON autocrm.sessions
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- Create policies for feedback
CREATE POLICY feedback_org_access ON autocrm.feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM autocrm.actions a
            WHERE a.action_id = feedback.action_id
            AND a.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
        OR
        EXISTS (
            SELECT 1 FROM autocrm.sessions s
            WHERE s.session_id = feedback.session_id
            AND s.organization_id = (auth.jwt() ->> 'organization_id')::uuid
        )
    ); 