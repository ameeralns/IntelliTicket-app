-- Update get_agent_performance function to use correct case for status
CREATE OR REPLACE FUNCTION get_agent_performance(
  p_agent_id TEXT,
  p_metric_type TEXT,
  p_timeframe TEXT
) RETURNS JSONB AS $$
DECLARE
  v_start_date TIMESTAMP;
  v_result JSONB;
BEGIN
  -- Set timeframe
  v_start_date := CASE p_timeframe
    WHEN 'day' THEN NOW() - INTERVAL '1 day'
    WHEN 'week' THEN NOW() - INTERVAL '1 week'
    WHEN 'month' THEN NOW() - INTERVAL '1 month'
    WHEN 'quarter' THEN NOW() - INTERVAL '3 months'
    WHEN 'year' THEN NOW() - INTERVAL '1 year'
    ELSE NOW() - INTERVAL '1 month'
  END;

  -- Get performance metrics based on type
  v_result := CASE p_metric_type
    WHEN 'efficiency' THEN (
      SELECT jsonb_build_object(
        'average_resolution_time', AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))),
        'first_response_time', AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))),
        'tickets_resolved', COUNT(CASE WHEN status = 'Resolved' THEN 1 END),
        'resolution_rate', COUNT(CASE WHEN status = 'Resolved' THEN 1 END)::FLOAT / COUNT(*)::FLOAT
      )
      FROM tickets t
      WHERE t.assigned_to = p_agent_id
      AND t.created_at >= v_start_date
    )
    WHEN 'quality' THEN (
      SELECT jsonb_build_object(
        'customer_satisfaction', AVG(satisfaction_rating),
        'feedback_score', AVG(feedback_score),
        'reopen_rate', COUNT(CASE WHEN reopened_count > 0 THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'escalation_rate', COUNT(CASE WHEN escalated THEN 1 END)::FLOAT / COUNT(*)::FLOAT
      )
      FROM tickets t
      WHERE t.assigned_to = p_agent_id
      AND t.created_at >= v_start_date
    )
    ELSE jsonb_build_object(
      'error', 'Invalid metric type'
    )
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql; 