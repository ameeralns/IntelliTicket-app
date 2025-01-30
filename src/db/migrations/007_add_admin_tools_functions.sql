-- Function to get customer details
CREATE OR REPLACE FUNCTION get_customer_details(
    p_organization_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
) RETURNS TABLE (
    customer_id UUID,
    email TEXT,
    name TEXT,
    total_tickets INT,
    open_tickets INT,
    avg_satisfaction FLOAT,
    last_interaction TIMESTAMPTZ,
    ticket_history JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH customer_stats AS (
        SELECT 
            c.customer_id,
            c.email,
            c.name,
            COUNT(t.ticket_id) as total_tickets,
            COUNT(t.ticket_id) FILTER (WHERE t.status != 'Closed') as open_tickets,
            AVG(t.satisfaction_score) as avg_satisfaction,
            MAX(t.updated_at) as last_interaction,
            jsonb_agg(jsonb_build_object(
                'ticket_id', t.ticket_id,
                'title', t.title,
                'status', t.status,
                'created_at', t.created_at,
                'updated_at', t.updated_at,
                'satisfaction_score', t.satisfaction_score
            )) as ticket_history
        FROM customers c
        LEFT JOIN tickets t ON t.customer_id = c.customer_id
        WHERE c.organization_id = p_organization_id
        AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
        AND (p_email IS NULL OR c.email ILIKE p_email)
        GROUP BY c.customer_id, c.email, c.name
    )
    SELECT * FROM customer_stats;
END;
$$;

-- Function to get detailed agent information
CREATE OR REPLACE FUNCTION get_agent_details(
    p_organization_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
) RETURNS TABLE (
    agent_id UUID,
    name TEXT,
    email TEXT,
    current_workload INT,
    avg_response_time FLOAT,
    avg_resolution_time FLOAT,
    satisfaction_score FLOAT,
    skills JSONB,
    recent_tickets JSONB,
    performance_metrics JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH recent_ticket_data AS (
        SELECT 
            t.ticket_id,
            t.title,
            t.status,
            t.created_at
        FROM tickets t
        WHERE t.agent_id = p_agent_id
        AND t.organization_id = p_organization_id
        ORDER BY t.created_at DESC
        LIMIT 10
    ),
    performance_data AS (
        SELECT 
            a.agent_id,
            a.name,
            a.email,
            COUNT(*) FILTER (WHERE t.status NOT IN ('Resolved', 'Closed')) as current_workload,
            AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_resolution_time,
            AVG(t.satisfaction_score) as satisfaction_score,
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'skill', skill_name,
                    'level', proficiency_level
                ))
                FROM agent_skills
                WHERE agent_id = a.agent_id
            ) as skills,
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'ticket_id', rtd.ticket_id,
                    'title', rtd.title,
                    'status', rtd.status,
                    'created_at', rtd.created_at
                ))
                FROM recent_ticket_data rtd
            ) as recent_tickets,
            jsonb_build_object(
                'tickets_resolved_today', COUNT(*) FILTER (WHERE t.status = 'Resolved' AND t.updated_at >= CURRENT_DATE),
                'tickets_assigned_today', COUNT(*) FILTER (WHERE t.created_at >= CURRENT_DATE),
                'avg_handling_time', AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600)
            ) as performance_metrics
        FROM agents a
        LEFT JOIN tickets t ON t.agent_id = a.agent_id
        WHERE (p_agent_id IS NULL OR a.agent_id = p_agent_id)
        AND a.organization_id = p_organization_id
        AND (p_email IS NULL OR a.email ILIKE p_email)
        GROUP BY a.agent_id, a.name, a.email
    )
    SELECT * FROM performance_data;
END;
$$;

-- Function to manage ticket properties
CREATE OR REPLACE FUNCTION manage_ticket(
    p_organization_id UUID,
    p_ticket_id UUID,
    p_action TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
    ticket_id UUID,
    action TEXT,
    success BOOLEAN,
    message TEXT,
    updated_data JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    v_ticket tickets%ROWTYPE;
    v_message TEXT;
    v_success BOOLEAN;
    v_updated_data JSONB;
BEGIN
    -- Get current ticket and verify organization access
    SELECT * INTO v_ticket
    FROM tickets
    WHERE ticket_id = p_ticket_id
    AND organization_id = p_organization_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            p_ticket_id,
            p_action,
            FALSE,
            'Ticket not found or access denied'::TEXT,
            NULL::JSONB;
        RETURN;
    END IF;

    -- Process different actions
    CASE p_action
        WHEN 'update_priority' THEN
            IF NOT p_data->>'priority' = ANY(ARRAY['Low', 'Medium', 'High', 'Urgent']) THEN
                RETURN QUERY SELECT 
                    p_ticket_id,
                    p_action,
                    FALSE,
                    'Invalid priority value'::TEXT,
                    NULL::JSONB;
                RETURN;
            END IF;
            
            UPDATE tickets
            SET 
                priority = p_data->>'priority',
                updated_at = NOW()
            WHERE ticket_id = p_ticket_id
            AND organization_id = p_organization_id;
            v_message := 'Priority updated';
            v_success := TRUE;
            v_updated_data := jsonb_build_object('priority', p_data->>'priority');

        WHEN 'update_status' THEN
            IF NOT p_data->>'status' = ANY(ARRAY['New', 'Assigned', 'In Progress', 'Resolved', 'Closed']) THEN
                RETURN QUERY SELECT 
                    p_ticket_id,
                    p_action,
                    FALSE,
                    'Invalid status value'::TEXT,
                    NULL::JSONB;
                RETURN;
            END IF;
            
            UPDATE tickets
            SET 
                status = p_data->>'status',
                updated_at = NOW()
            WHERE ticket_id = p_ticket_id
            AND organization_id = p_organization_id;
            v_message := 'Status updated';
            v_success := TRUE;
            v_updated_data := jsonb_build_object('status', p_data->>'status');

        WHEN 'reassign' THEN
            -- Verify agent exists and belongs to same organization
            IF NOT EXISTS (
                SELECT 1 FROM agents 
                WHERE agent_id = (p_data->>'agent_id')::UUID
                AND organization_id = p_organization_id
            ) THEN
                RETURN QUERY SELECT 
                    p_ticket_id,
                    p_action,
                    FALSE,
                    'Agent not found or access denied'::TEXT,
                    NULL::JSONB;
                RETURN;
            END IF;
            
            UPDATE tickets
            SET 
                agent_id = (p_data->>'agent_id')::UUID,
                status = CASE 
                    WHEN status = 'New' THEN 'Assigned'
                    ELSE status
                END,
                updated_at = NOW()
            WHERE ticket_id = p_ticket_id
            AND organization_id = p_organization_id;
            v_message := 'Ticket reassigned';
            v_success := TRUE;
            v_updated_data := jsonb_build_object(
                'agent_id', p_data->>'agent_id',
                'status', CASE 
                    WHEN v_ticket.status = 'New' THEN 'Assigned'
                    ELSE v_ticket.status
                END
            );

        ELSE
            v_message := 'Unknown action';
            v_success := FALSE;
            v_updated_data := NULL;
    END CASE;

    -- Create an interaction record for the change
    IF v_success THEN
        INSERT INTO interactions (
            ticket_id,
            agent_id,
            content,
            interaction_type,
            is_private
        ) VALUES (
            p_ticket_id,
            CASE 
                WHEN p_action = 'reassign' THEN (p_data->>'agent_id')::UUID
                ELSE v_ticket.agent_id
            END,
            CASE 
                WHEN p_action = 'update_priority' THEN format('Priority updated to %s', p_data->>'priority')
                WHEN p_action = 'update_status' THEN format('Status updated to %s', p_data->>'status')
                WHEN p_action = 'reassign' THEN format('Ticket reassigned to agent %s', p_data->>'agent_id')
                ELSE 'Ticket updated'
            END,
            'Note',
            true
        );
    END IF;

    RETURN QUERY SELECT 
        p_ticket_id,
        p_action,
        v_success,
        v_message,
        v_updated_data;
END;
$$;

-- Function to analyze feedback
CREATE OR REPLACE FUNCTION analyze_feedback(
    p_organization_id UUID,
    p_timeframe TEXT DEFAULT 'today',
    p_agent_id UUID DEFAULT NULL,
    p_category TEXT DEFAULT NULL
) RETURNS TABLE (
    period TEXT,
    avg_satisfaction FLOAT,
    total_responses INT,
    feedback_distribution JSONB,
    trending_issues JSONB,
    improvement_areas JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH feedback_stats AS (
        SELECT 
            t.ticket_id,
            t.satisfaction_score,
            t.title as feedback_text,
            cf.field_value as category,
            t.agent_id,
            t.created_at,
            t.updated_at
        FROM tickets t
        LEFT JOIN custom_fields cf ON cf.ticket_id = t.ticket_id 
            AND cf.field_name = 'category'
        WHERE t.organization_id = p_organization_id
        AND CASE p_timeframe
            WHEN 'today' THEN DATE(t.created_at) = CURRENT_DATE
            WHEN 'this_week' THEN t.created_at >= DATE_TRUNC('week', CURRENT_DATE)
            WHEN 'this_month' THEN t.created_at >= DATE_TRUNC('month', CURRENT_DATE)
            WHEN 'last_month' THEN t.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            ELSE TRUE
        END
        AND (p_agent_id IS NULL OR t.agent_id = p_agent_id)
        AND (p_category IS NULL OR cf.field_value = p_category)
    )
    SELECT 
        p_timeframe as period,
        AVG(satisfaction_score) as avg_satisfaction,
        COUNT(*) as total_responses,
        jsonb_build_object(
            'excellent', COUNT(*) FILTER (WHERE satisfaction_score >= 4.5),
            'good', COUNT(*) FILTER (WHERE satisfaction_score >= 3.5 AND satisfaction_score < 4.5),
            'average', COUNT(*) FILTER (WHERE satisfaction_score >= 2.5 AND satisfaction_score < 3.5),
            'poor', COUNT(*) FILTER (WHERE satisfaction_score < 2.5)
        ) as feedback_distribution,
        jsonb_agg(DISTINCT jsonb_build_object(
            'category', category,
            'count', COUNT(*) OVER (PARTITION BY category),
            'avg_satisfaction', AVG(satisfaction_score) OVER (PARTITION BY category)
        )) as trending_issues,
        jsonb_build_object(
            'response_time', AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600),
            'low_satisfaction_categories', (
                SELECT jsonb_agg(DISTINCT category)
                FROM feedback_stats fs2
                WHERE fs2.satisfaction_score < 3.0
            )
        ) as improvement_areas
    FROM feedback_stats
    GROUP BY p_timeframe;
END;
$$;

-- Function to get team metrics
CREATE OR REPLACE FUNCTION get_team_metrics(
    p_organization_id UUID,
    p_timeframe TEXT DEFAULT 'today',
    p_team_id UUID DEFAULT NULL,
    p_metric_type TEXT DEFAULT 'all'
) RETURNS TABLE (
    team_id UUID,
    period TEXT,
    workload_metrics JSONB,
    performance_metrics JSONB,
    satisfaction_metrics JSONB,
    efficiency_metrics JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    v_start_date TIMESTAMP;
    v_end_date TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- Set time range based on timeframe
    v_start_date := CASE p_timeframe
        WHEN 'today' THEN CURRENT_DATE
        WHEN 'this_week' THEN DATE_TRUNC('week', CURRENT_DATE)
        WHEN 'this_month' THEN DATE_TRUNC('month', CURRENT_DATE)
        WHEN 'last_month' THEN DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        ELSE CURRENT_DATE - INTERVAL '30 days'
    END;

    RETURN QUERY
    WITH team_stats AS (
        SELECT 
            t.team_id,
            t.name as team_name,
            a.agent_id,
            tk.ticket_id,
            tk.status,
            tk.priority,
            tk.created_at,
            tk.updated_at,
            tk.satisfaction_score,
            i.interaction_id,
            i.created_at as interaction_time
        FROM teams t
        JOIN agents a ON a.team_id = t.team_id
        LEFT JOIN tickets tk ON tk.agent_id = a.agent_id
        LEFT JOIN interactions i ON i.ticket_id = tk.ticket_id
        WHERE t.organization_id = p_organization_id
        AND (p_team_id IS NULL OR t.team_id = p_team_id)
        AND (tk.created_at IS NULL OR tk.created_at >= v_start_date)
        AND (tk.created_at IS NULL OR tk.created_at <= v_end_date)
    )
    SELECT 
        ts.team_id,
        p_timeframe as period,
        CASE WHEN p_metric_type IN ('all', 'workload') THEN
            jsonb_build_object(
                'total_tickets', COUNT(DISTINCT ticket_id),
                'active_tickets', COUNT(DISTINCT ticket_id) FILTER (WHERE status NOT IN ('Resolved', 'Closed')),
                'tickets_by_priority', jsonb_build_object(
                    'urgent', COUNT(*) FILTER (WHERE priority = 'Urgent'),
                    'high', COUNT(*) FILTER (WHERE priority = 'High'),
                    'medium', COUNT(*) FILTER (WHERE priority = 'Medium'),
                    'low', COUNT(*) FILTER (WHERE priority = 'Low')
                ),
                'tickets_by_status', jsonb_build_object(
                    'new', COUNT(*) FILTER (WHERE status = 'New'),
                    'assigned', COUNT(*) FILTER (WHERE status = 'Assigned'),
                    'in_progress', COUNT(*) FILTER (WHERE status = 'In Progress'),
                    'resolved', COUNT(*) FILTER (WHERE status = 'Resolved'),
                    'closed', COUNT(*) FILTER (WHERE status = 'Closed')
                ),
                'agents_count', COUNT(DISTINCT agent_id)
            )
        ELSE NULL END as workload_metrics,
        
        CASE WHEN p_metric_type IN ('all', 'performance') THEN
            jsonb_build_object(
                'avg_resolution_time', ROUND(AVG(
                    CASE 
                        WHEN status IN ('Resolved', 'Closed') THEN 
                            EXTRACT(EPOCH FROM (updated_at - created_at))/3600
                        ELSE NULL
                    END
                )::numeric, 2),
                'tickets_resolved', COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')),
                'resolution_rate', ROUND(
                    (COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed'))::numeric / 
                    NULLIF(COUNT(*), 0) * 100)::numeric, 2
                )
            )
        ELSE NULL END as performance_metrics,
        
        CASE WHEN p_metric_type IN ('all', 'satisfaction') THEN
            jsonb_build_object(
                'avg_satisfaction', ROUND(AVG(satisfaction_score)::numeric, 2),
                'satisfaction_distribution', jsonb_build_object(
                    'excellent', COUNT(*) FILTER (WHERE satisfaction_score >= 4.5),
                    'good', COUNT(*) FILTER (WHERE satisfaction_score >= 3.5 AND satisfaction_score < 4.5),
                    'average', COUNT(*) FILTER (WHERE satisfaction_score >= 2.5 AND satisfaction_score < 3.5),
                    'poor', COUNT(*) FILTER (WHERE satisfaction_score < 2.5)
                ),
                'rated_tickets', COUNT(*) FILTER (WHERE satisfaction_score IS NOT NULL)
            )
        ELSE NULL END as satisfaction_metrics,
        
        CASE WHEN p_metric_type IN ('all', 'efficiency') THEN
            jsonb_build_object(
                'tickets_per_agent', ROUND(COUNT(DISTINCT ticket_id)::numeric / 
                    NULLIF(COUNT(DISTINCT agent_id), 0), 2),
                'interactions_per_ticket', ROUND(COUNT(interaction_id)::numeric / 
                    NULLIF(COUNT(DISTINCT ticket_id), 0), 2),
                'avg_handling_time', ROUND(AVG(
                    CASE 
                        WHEN status IN ('Resolved', 'Closed') THEN 
                            EXTRACT(EPOCH FROM (updated_at - created_at))/3600
                        ELSE NULL
                    END
                )::numeric, 2)
            )
        ELSE NULL END as efficiency_metrics
    FROM team_stats ts
    GROUP BY ts.team_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_agents_team_id ON agents(team_id);
CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_details TO authenticated;
GRANT EXECUTE ON FUNCTION manage_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_metrics TO authenticated;

-- Function to create ai_chat_sessions table if it doesn't exist
CREATE OR REPLACE FUNCTION create_ai_chat_sessions_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create auth.organizations table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'auth' 
        AND tablename = 'organizations'
    ) THEN
        CREATE SCHEMA IF NOT EXISTS auth;
        
        CREATE TABLE auth.organizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- Add RLS policies for organizations
        ALTER TABLE auth.organizations ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their organizations"
            ON auth.organizations
            FOR SELECT
            TO authenticated
            USING (id = auth.jwt() ->> 'organization_id'::text);
    END IF;

    -- Create ai_chat_sessions table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_chat_sessions'
    ) THEN
        -- Create the table
        CREATE TABLE public.ai_chat_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            organization_id UUID,
            session_id TEXT NOT NULL,
            messages JSONB DEFAULT '[]'::jsonb,
            command TEXT,
            parsed_command JSONB,
            result JSONB,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT fk_organization
                FOREIGN KEY (organization_id)
                REFERENCES auth.organizations(id)
                ON DELETE CASCADE
        );

        -- Add RLS policies
        ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their organization's chat sessions"
            ON public.ai_chat_sessions
            FOR SELECT
            TO authenticated
            USING (organization_id = auth.jwt() ->> 'organization_id'::text);

        CREATE POLICY "Users can insert chat sessions for their organization"
            ON public.ai_chat_sessions
            FOR INSERT
            TO authenticated
            WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);

        -- Add indexes
        CREATE INDEX idx_ai_chat_sessions_org_id ON public.ai_chat_sessions(organization_id);
        CREATE INDEX idx_ai_chat_sessions_created_at ON public.ai_chat_sessions(created_at DESC);
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_ai_chat_sessions_table TO authenticated; 