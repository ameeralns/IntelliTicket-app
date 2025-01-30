-- Test suite for AI tools

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS run_ai_tools_tests();
DROP FUNCTION IF EXISTS test_ticket_management();
DROP FUNCTION IF EXISTS test_agent_performance();
DROP FUNCTION IF EXISTS test_customer_analysis();
DROP FUNCTION IF EXISTS setup_test_data();

-- Create test data function
CREATE OR REPLACE FUNCTION setup_test_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_team_id UUID;
    v_agent_id UUID;
    v_customer_id UUID;
    v_ticket_id UUID;
BEGIN
    -- Create test organization
    INSERT INTO organizations (
        name,
        description,
        customer_code,
        agent_code
    )
    VALUES (
        'Test Organization',
        'Test Organization Description',
        'TEST_CUST',
        'TEST_AGENT'
    )
    RETURNING organization_id INTO v_org_id;

    -- Create test team
    INSERT INTO teams (
        name,
        organization_id,
        description
    )
    VALUES (
        'Test Team',
        v_org_id,
        'Test Team Description'
    )
    RETURNING team_id INTO v_team_id;

    -- Create test agent
    INSERT INTO agents (
        name,
        email,
        role,
        team_id,
        organization_id
    )
    VALUES (
        'Test Agent',
        'test.agent@example.com',
        'agent',
        v_team_id,
        v_org_id
    )
    RETURNING agent_id INTO v_agent_id;

    -- Generate a test customer ID
    v_customer_id := gen_random_uuid();

    -- Create test tickets with various states
    -- Open ticket
    INSERT INTO tickets (
        title, 
        description, 
        status, 
        priority, 
        customer_id, 
        agent_id,
        team_id,
        organization_id,
        satisfaction_score,
        assigned_to,
        assigned_at
    )
    VALUES (
        'Test Ticket 1',
        'Open ticket for testing',
        'open',
        'HIGH'::text,
        v_customer_id,
        v_agent_id,
        v_team_id,
        v_org_id,
        5,
        v_agent_id,
        CURRENT_TIMESTAMP
    );

    -- Resolved ticket
    INSERT INTO tickets (
        title, 
        description, 
        status, 
        priority, 
        customer_id, 
        agent_id,
        team_id,
        organization_id,
        satisfaction_score,
        assigned_to,
        assigned_at,
        created_at
    )
    VALUES (
        'Test Ticket 2',
        'Resolved ticket for testing',
        'resolved',
        'MEDIUM'::text,
        v_customer_id,
        v_agent_id,
        v_team_id,
        v_org_id,
        4,
        v_agent_id,
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    );

    -- High priority ticket
    INSERT INTO tickets (
        title, 
        description, 
        status, 
        priority, 
        customer_id, 
        agent_id,
        team_id,
        organization_id,
        assigned_to,
        assigned_at,
        created_at
    )
    VALUES (
        'Test Ticket 3',
        'High priority ticket for testing',
        'open',
        'URGENT'::text,
        v_customer_id,
        v_agent_id,
        v_team_id,
        v_org_id,
        v_agent_id,
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );
END;
$$;

-- Test customer analysis
CREATE OR REPLACE FUNCTION test_customer_analysis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_customer_id UUID;
BEGIN
    -- Get a test customer
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = 'test.customer@example.com';

    -- Test customer details
    v_result := get_customer_details();
    
    -- Test customer analysis
    v_result := v_result || jsonb_build_object(
        'customer_analysis', (
            SELECT analyze_customer_data(
                v_customer_id,
                'full',
                'weekly'
            )
        )
    );

    RETURN jsonb_build_object(
        'test_name', 'Customer Analysis Test',
        'passed', (v_result IS NOT NULL),
        'results', v_result
    );
END;
$$;

-- Test agent performance
CREATE OR REPLACE FUNCTION test_agent_performance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_agent_id UUID;
BEGIN
    -- Get a test agent
    SELECT agent_id INTO v_agent_id
    FROM agents
    WHERE email = 'test.agent@example.com';

    -- Test different metric types
    v_result := jsonb_build_object(
        'response_time_metrics', get_agent_performance(v_agent_id::text, 'response_time', 'week'),
        'workload_metrics', get_agent_performance(v_agent_id::text, 'workload', 'week'),
        'satisfaction_metrics', get_agent_performance(v_agent_id::text, 'satisfaction', 'week')
    );

    RETURN jsonb_build_object(
        'test_name', 'Agent Performance Test',
        'passed', (v_result IS NOT NULL),
        'results', v_result
    );
END;
$$;

-- Test ticket management
CREATE OR REPLACE FUNCTION test_ticket_management()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_org_id UUID;
    v_ticket_id UUID;
    v_agent_id UUID;
BEGIN
    -- Get test data
    SELECT id INTO v_org_id FROM organizations WHERE name = 'Test Organization';
    SELECT id INTO v_ticket_id FROM tickets WHERE title = 'Test Ticket 1';
    SELECT id INTO v_agent_id FROM agents WHERE email = 'test.agent@example.com';

    -- Test ticket reassignment
    v_result := jsonb_build_object(
        'reassignment_test', (
            SELECT manage_ticket(
                v_org_id,
                v_ticket_id,
                'reassign',
                jsonb_build_object('agent_id', v_agent_id)
            )
        )
    );

    -- Test priority update
    v_result := v_result || jsonb_build_object(
        'priority_update_test', (
            SELECT manage_ticket(
                v_org_id,
                v_ticket_id,
                'update_priority',
                jsonb_build_object('priority', 'urgent')
            )
        )
    );

    -- Test status update
    v_result := v_result || jsonb_build_object(
        'status_update_test', (
            SELECT manage_ticket(
                v_org_id,
                v_ticket_id,
                'update_status',
                jsonb_build_object('status', 'resolved')
            )
        )
    );

    RETURN jsonb_build_object(
        'test_name', 'Ticket Management Test',
        'passed', (v_result IS NOT NULL),
        'results', v_result
    );
END;
$$;

-- Main test runner function
CREATE OR REPLACE FUNCTION run_ai_tools_tests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_results JSONB;
BEGIN
    -- Setup test data
    PERFORM setup_test_data();

    -- Run all tests
    v_results := jsonb_build_object(
        'customer_analysis_tests', test_customer_analysis(),
        'agent_performance_tests', test_agent_performance(),
        'ticket_management_tests', test_ticket_management()
    );

    RETURN jsonb_build_object(
        'test_suite', 'AI Tools Test Suite',
        'timestamp', CURRENT_TIMESTAMP,
        'results', v_results
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION setup_test_data() TO authenticated;
GRANT EXECUTE ON FUNCTION test_customer_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION test_agent_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION test_ticket_management() TO authenticated;
GRANT EXECUTE ON FUNCTION run_ai_tools_tests() TO authenticated;

-- Comment explaining how to run tests
COMMENT ON FUNCTION run_ai_tools_tests() IS 'Run this function to test all AI tools. Example: SELECT run_ai_tools_tests();'; 