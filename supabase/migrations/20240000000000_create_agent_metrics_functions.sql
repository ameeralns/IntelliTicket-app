-- Function to calculate agent satisfaction rate
CREATE OR REPLACE FUNCTION get_agent_satisfaction(agent_uuid UUID)
RETURNS FLOAT AS $$
BEGIN
    RETURN (
        SELECT 
            COALESCE(AVG(customer_satisfaction), 0)
        FROM tickets
        WHERE 
            agent_id = agent_uuid 
            AND customer_satisfaction IS NOT NULL
            AND status IN ('Resolved', 'Closed')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average first response time in minutes
CREATE OR REPLACE FUNCTION get_agent_avg_response_time(agent_uuid UUID)
RETURNS FLOAT AS $$
BEGIN
    RETURN (
        SELECT 
            COALESCE(
                AVG(
                    EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60
                ),
                0
            )
        FROM tickets
        WHERE 
            agent_id = agent_uuid 
            AND first_response_at IS NOT NULL
            AND created_at IS NOT NULL
            AND first_response_at > created_at
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average resolution time in minutes
CREATE OR REPLACE FUNCTION get_agent_avg_resolution_time(agent_uuid UUID)
RETURNS FLOAT AS $$
BEGIN
    RETURN (
        SELECT 
            COALESCE(
                AVG(
                    EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
                ),
                0
            )
        FROM tickets
        WHERE 
            agent_id = agent_uuid 
            AND resolved_at IS NOT NULL
            AND created_at IS NOT NULL
            AND resolved_at > created_at
            AND status IN ('Resolved', 'Closed')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get all metrics for an agent in one call
CREATE OR REPLACE FUNCTION get_agent_metrics(agent_uuid UUID)
RETURNS TABLE (
    satisfaction FLOAT,
    avg_response_time FLOAT,
    resolution_time FLOAT,
    tickets_resolved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        get_agent_satisfaction(agent_uuid) as satisfaction,
        get_agent_avg_response_time(agent_uuid) as avg_response_time,
        get_agent_avg_resolution_time(agent_uuid) as resolution_time,
        (
            SELECT COUNT(*)
            FROM tickets
            WHERE 
                agent_id = agent_uuid 
                AND status IN ('Resolved', 'Closed')
        ) as tickets_resolved;
END;
$$ LANGUAGE plpgsql; 