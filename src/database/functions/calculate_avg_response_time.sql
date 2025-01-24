CREATE OR REPLACE FUNCTION calculate_avg_response_time()
RETURNS TABLE (avg_response_time float) AS $$
BEGIN
  RETURN QUERY
  WITH first_responses AS (
    SELECT 
      t.ticket_id,
      t.created_at as ticket_created,
      MIN(i.created_at) as first_response
    FROM tickets t
    LEFT JOIN interactions i ON t.ticket_id = i.ticket_id
    WHERE i.agent_id IS NOT NULL
    GROUP BY t.ticket_id, t.created_at
  )
  SELECT 
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (first_response - ticket_created)) / 3600
      ),
      0
    ) as avg_response_time
  FROM first_responses;
END;
$$ LANGUAGE plpgsql; 