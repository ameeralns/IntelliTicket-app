-- Create AI chat sessions table
CREATE TABLE IF NOT EXISTS autocrm.ai_chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    admin_id UUID NOT NULL,
    messages JSONB[] NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT jsonb_build_object(
        'command_types', '[]'::jsonb,
        'entities_referenced', '[]'::jsonb,
        'confidence_scores', '[]'::jsonb
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI command logs table for tracing
CREATE TABLE IF NOT EXISTS autocrm.ai_command_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES autocrm.ai_chat_sessions(session_id),
    command_type TEXT NOT NULL,
    input TEXT NOT NULL,
    thought_process TEXT,
    action TEXT,
    observation TEXT,
    final_response TEXT,
    entities JSONB,
    confidence_score FLOAT,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to parse and validate admin commands
CREATE OR REPLACE FUNCTION autocrm.parse_admin_command(
    command_text TEXT
) RETURNS TABLE (
    command_type TEXT,
    entities JSONB,
    confidence_score FLOAT
) LANGUAGE plpgsql AS $$
DECLARE
    v_command_lower TEXT;
    v_entities JSONB;
    v_confidence FLOAT;
BEGIN
    v_command_lower := lower(command_text);
    
    -- Initialize entities
    v_entities := '{}'::jsonb;
    v_confidence := 0.0;

    -- Ticket assignment pattern
    IF v_command_lower ~ 'assign ticket #?\d+ to \w+' THEN
        v_entities := jsonb_build_object(
            'ticket_id', (regexp_match(command_text, '#?(\d+)'))::text[1],
            'agent_name', (regexp_match(command_text, 'to (\w+)'))::text[1]
        );
        RETURN QUERY SELECT 
            'ASSIGN_TICKET'::TEXT,
            v_entities,
            0.95::FLOAT;

    -- Workload query pattern
    ELSIF v_command_lower ~ '\w+''s workload' OR v_command_lower ~ 'show workload' THEN
        v_entities := CASE 
            WHEN v_command_lower ~ '\w+''s workload' 
            THEN jsonb_build_object(
                'agent_name', (regexp_match(command_text, '(\w+)''s'))::text[1]
            )
            ELSE '{}'::jsonb
        END;
        RETURN QUERY SELECT 
            'QUERY_WORKLOAD'::TEXT,
            v_entities,
            0.90::FLOAT;

    -- Performance metrics pattern
    ELSIF v_command_lower ~ 'performance|metrics|satisfaction' THEN
        v_entities := jsonb_build_object(
            'metric_type', CASE 
                WHEN v_command_lower ~ 'satisfaction' THEN 'satisfaction'
                WHEN v_command_lower ~ 'response time' THEN 'response_time'
                ELSE 'all'
            END
        );
        RETURN QUERY SELECT 
            'QUERY_PERFORMANCE'::TEXT,
            v_entities,
            0.85::FLOAT;

    -- Ticket details pattern
    ELSIF v_command_lower ~ 'ticket #?\d+' THEN
        v_entities := jsonb_build_object(
            'ticket_id', (regexp_match(command_text, '#?(\d+)'))::text[1]
        );
        RETURN QUERY SELECT 
            'QUERY_TICKET'::TEXT,
            v_entities,
            0.90::FLOAT;

    -- Agent details pattern
    ELSIF v_command_lower ~ 'show agent \w+|agent \w+ details' THEN
        v_entities := jsonb_build_object(
            'agent_name', (regexp_match(command_text, 'agent (\w+)'))::text[1]
        );
        RETURN QUERY SELECT 
            'QUERY_AGENT'::TEXT,
            v_entities,
            0.90::FLOAT;

    ELSE
        RETURN QUERY SELECT 
            'UNKNOWN'::TEXT,
            '{}'::jsonb,
            0.0::FLOAT;
    END IF;
END;
$$;

-- Create function to execute admin commands with ReAct framework
CREATE OR REPLACE FUNCTION autocrm.execute_admin_command(
    p_organization_id UUID,
    p_command_type TEXT,
    p_entities JSONB,
    p_session_id UUID
) RETURNS TABLE (
    thought TEXT,
    action TEXT,
    observation TEXT,
    response TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_thought TEXT;
    v_action TEXT;
    v_observation TEXT;
    v_response TEXT;
BEGIN
    -- Initialize ReAct framework steps
    v_thought := format('Processing %s command with entities: %s', p_command_type, p_entities);
    
    CASE p_command_type
        WHEN 'ASSIGN_TICKET' THEN
            -- Assign ticket logic
            v_action := format('Checking ticket %s and agent %s availability', 
                p_entities->>'ticket_id', p_entities->>'agent_name');
            
            -- Verify ticket and agent exist
            WITH ticket_check AS (
                SELECT t.ticket_id, t.status, t.assigned_to
                FROM autocrm.tickets t
                WHERE t.ticket_id = (p_entities->>'ticket_id')::UUID
                AND t.organization_id = p_organization_id
            ),
            agent_check AS (
                SELECT a.agent_id, a.current_workload
                FROM autocrm.agents a
                WHERE a.name ILIKE format('%%%s%%', p_entities->>'agent_name')
                AND a.organization_id = p_organization_id
            )
            SELECT 
                CASE 
                    WHEN tc.ticket_id IS NULL THEN 'Ticket not found'
                    WHEN ac.agent_id IS NULL THEN 'Agent not found'
                    ELSE format('Ticket %s assigned to agent %s', p_entities->>'ticket_id', p_entities->>'agent_name')
                END,
                format('Updating ticket assignment: %s -> %s', tc.assigned_to, ac.agent_id)
            INTO v_observation, v_response
            FROM ticket_check tc
            CROSS JOIN agent_check ac;

        WHEN 'QUERY_WORKLOAD' THEN
            -- Query workload logic
            v_action := CASE 
                WHEN p_entities ? 'agent_name' 
                THEN format('Retrieving workload for agent %s', p_entities->>'agent_name')
                ELSE 'Retrieving workload for all agents'
            END;

            WITH workload_data AS (
                SELECT 
                    a.name,
                    a.current_workload,
                    COUNT(t.ticket_id) FILTER (WHERE t.status = 'open') as open_tickets,
                    get_agent_metrics(a.agent_id) as metrics
                FROM autocrm.agents a
                LEFT JOIN autocrm.tickets t ON t.assigned_to = a.agent_id
                WHERE a.organization_id = p_organization_id
                AND (
                    NOT p_entities ? 'agent_name' 
                    OR a.name ILIKE format('%%%s%%', p_entities->>'agent_name')
                )
                GROUP BY a.agent_id, a.name, a.current_workload
            )
            SELECT 
                format('Found workload data for %s agent(s)', COUNT(*)),
                string_agg(
                    format('%s: %s current tickets, %s open', 
                        name, current_workload, open_tickets),
                    E'\n'
                )
            INTO v_observation, v_response
            FROM workload_data;

        WHEN 'QUERY_PERFORMANCE' THEN
            -- Query performance logic
            v_action := 'Retrieving performance metrics';
            
            WITH performance_data AS (
                SELECT 
                    get_agent_satisfaction(a.agent_id) as satisfaction,
                    get_agent_avg_response_time(a.agent_id) as response_time,
                    get_agent_avg_resolution_time(a.agent_id) as resolution_time
                FROM autocrm.agents a
                WHERE a.organization_id = p_organization_id
            )
            SELECT 
                'Retrieved performance metrics',
                format(
                    'Current performance metrics:\n' ||
                    'Average satisfaction: %.2f%%\n' ||
                    'Average response time: %.2f minutes\n' ||
                    'Average resolution time: %.2f minutes',
                    AVG(satisfaction) * 100,
                    AVG(response_time),
                    AVG(resolution_time)
                )
            INTO v_observation, v_response
            FROM performance_data;

        ELSE
            v_action := 'Unknown command type';
            v_observation := 'Cannot process unknown command type';
            v_response := 'I''m not sure how to handle this request. Please try rephrasing it.';
    END CASE;

    -- Log the ReAct process
    INSERT INTO autocrm.ai_command_logs (
        session_id,
        command_type,
        input,
        thought_process,
        action,
        observation,
        final_response,
        entities,
        success
    ) VALUES (
        p_session_id,
        p_command_type,
        p_entities::TEXT,
        v_thought,
        v_action,
        v_observation,
        v_response,
        p_entities,
        v_observation NOT LIKE 'Error%'
    );

    RETURN QUERY SELECT v_thought, v_action, v_observation, v_response;
END;
$$;

-- Create indexes
CREATE INDEX idx_ai_chat_sessions_org ON autocrm.ai_chat_sessions(organization_id);
CREATE INDEX idx_ai_chat_sessions_admin ON autocrm.ai_chat_sessions(admin_id);
CREATE INDEX idx_ai_command_logs_session ON autocrm.ai_command_logs(session_id);
CREATE INDEX idx_ai_command_logs_type ON autocrm.ai_command_logs(command_type);
CREATE INDEX idx_ai_command_logs_created ON autocrm.ai_command_logs(created_at);

-- Grant permissions
GRANT USAGE ON SCHEMA autocrm TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA autocrm TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA autocrm TO authenticated; 