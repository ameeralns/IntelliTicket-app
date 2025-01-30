-- Create test suite for core AI tools
CREATE OR REPLACE FUNCTION test_ai_tools()
RETURNS JSONB AS $$
DECLARE
    v_test_org_id UUID;
    v_test_agent_id UUID;
    v_test_team_id UUID;
    v_test_customer_id UUID;
    v_test_ticket_ids UUID[];
    v_results JSONB := '{}'::JSONB;
    v_start_time TIMESTAMP;
BEGIN
    -- Store the start time
    v_start_time := clock_timestamp();

    -- Create test data
    INSERT INTO organizations (organization_id, name) 
    VALUES (gen_random_uuid(), 'Test Organization') 
    RETURNING organization_id INTO v_test_org_id;

    INSERT INTO teams (team_id, organization_id, name) 
    VALUES (gen_random_uuid(), v_test_org_id, 'Test Team')
    RETURNING team_id INTO v_test_team_id;

    INSERT INTO agents (agent_id, organization_id, team_id, name, email, role)
    VALUES (
        gen_random_uuid(), 
        v_test_org_id, 
        v_test_team_id, 
        'Test Agent', 
        'test_' || extract(epoch from clock_timestamp())::text || '@example.com',
        'agent'
    )
    RETURNING agent_id INTO v_test_agent_id;

    INSERT INTO customers (customer_id, organization_id, name, email)
    VALUES (
        gen_random_uuid(), 
        v_test_org_id, 
        'Test Customer', 
        'customer_' || extract(epoch from clock_timestamp())::text || '@example.com'
    )
    RETURNING customer_id INTO v_test_customer_id;

    -- Test 1: Organization Structure Query
    BEGIN
        v_results := v_results || jsonb_build_object(
            'org_structure_test',
            (SELECT get_organization_structure(v_test_org_id))
        );
        RAISE NOTICE 'Organization Structure Query test passed';
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_object(
            'org_structure_test',
            jsonb_build_object('error', SQLERRM)
        );
    END;

    -- Test 2: Ticket Assignment
    BEGIN
        -- Create test tickets
        WITH new_tickets AS (
            INSERT INTO tickets (
                organization_id,
                customer_id,
                title,
                description,
                status,
                priority
            )
            SELECT 
                v_test_org_id,
                v_test_customer_id,
                'Test Ticket ' || generate_series,
                'Test Description ' || generate_series,
                'New',
                'Medium'
            FROM generate_series(1, 3)
            RETURNING ticket_id
        )
        SELECT array_agg(ticket_id) INTO v_test_ticket_ids FROM new_tickets;

        v_results := v_results || jsonb_build_object(
            'ticket_assignment_test',
            (SELECT manage_ticket_assignment(
                v_test_ticket_ids,
                v_test_agent_id,
                v_test_org_id
            ))
        );
        RAISE NOTICE 'Ticket Assignment test passed';
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_object(
            'ticket_assignment_test',
            jsonb_build_object('error', SQLERRM)
        );
    END;

    -- Add test execution metadata
    v_results := jsonb_build_object(
        'test_suite', 'ai_tools',
        'execution_time', extract(epoch from (clock_timestamp() - v_start_time)),
        'timestamp', NOW(),
        'results', v_results
    );

    -- Cleanup test data
    BEGIN
        -- First, clean up tickets
        DELETE FROM tickets 
        WHERE organization_id = v_test_org_id;

        -- Clean up agents
        DELETE FROM agents 
        WHERE organization_id = v_test_org_id;

        -- Clean up customers
        DELETE FROM customers 
        WHERE organization_id = v_test_org_id;

        -- Clean up teams
        DELETE FROM teams 
        WHERE organization_id = v_test_org_id;

        -- Finally, clean up the organization
        DELETE FROM organizations 
        WHERE organization_id = v_test_org_id;

        RAISE NOTICE 'Test data cleanup completed successfully';
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_object(
            'cleanup_error', SQLERRM
        );
        RAISE NOTICE 'Error during cleanup: %', SQLERRM;
    END;

    RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- Function to run all AI tools tests
CREATE OR REPLACE FUNCTION run_ai_tools_tests()
RETURNS JSONB AS $$
DECLARE
    v_results JSONB;
BEGIN
    -- Run the tests within a transaction
    BEGIN
        v_results := test_ai_tools();
        RAISE NOTICE 'AI tools tests completed successfully';
        RETURN v_results;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'AI tools tests failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'error', SQLERRM,
            'timestamp', NOW()
        );
    END;
END;
$$ LANGUAGE plpgsql; 