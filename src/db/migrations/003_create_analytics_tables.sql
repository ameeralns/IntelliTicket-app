-- Create analytics schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS autocrm;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agents (
    agent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    organization_id UUID NOT NULL,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS autocrm.performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(agent_id),
    metric_type VARCHAR(50) NOT NULL,
    time_period TSTZRANGE NOT NULL,
    metrics JSONB NOT NULL,
    insights JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Create index for metric type and time period
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_time 
ON autocrm.performance_metrics USING btree (metric_type, (lower(time_period)));

-- Alerts Table
CREATE TABLE IF NOT EXISTS autocrm.alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    metric VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    threshold FLOAT NOT NULL,
    actual_value FLOAT NOT NULL,
    context JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Create index for unacknowledged high severity alerts
CREATE INDEX IF NOT EXISTS idx_unacknowledged_high_severity_alerts 
ON autocrm.alerts (severity, acknowledged) 
WHERE severity = 'high' AND acknowledged = FALSE;

-- Analytics Reports Table
CREATE TABLE IF NOT EXISTS autocrm.analytics_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_range TSTZRANGE NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    metrics JSONB NOT NULL,
    recommendations JSONB,
    alerts JSONB,
    generated_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Create index for report type and time range
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type_time 
ON autocrm.analytics_reports USING btree (report_type, (lower(time_range)));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION autocrm.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_performance_metrics_modtime
    BEFORE UPDATE ON autocrm.performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

CREATE TRIGGER update_alerts_modtime
    BEFORE UPDATE ON autocrm.alerts
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

CREATE TRIGGER update_analytics_reports_modtime
    BEFORE UPDATE ON autocrm.analytics_reports
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

-- Create trigger for users table
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

-- Create trigger for agents table
CREATE TRIGGER update_agents_modtime
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION autocrm.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA autocrm TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA autocrm TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agents TO authenticated; 