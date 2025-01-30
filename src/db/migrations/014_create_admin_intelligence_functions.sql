-- Create functions for admin intelligence tools

-- Function to get team metrics
CREATE OR REPLACE FUNCTION get_team_metrics(
  p_team_id TEXT,
  p_timeframe TEXT,
  p_metric_type TEXT
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

  -- Get metrics based on type
  v_result := CASE p_metric_type
    WHEN 'performance' THEN (
      SELECT jsonb_build_object(
        'average_response_time', AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))),
        'resolution_rate', COUNT(CASE WHEN status = 'resolved' THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'customer_satisfaction', AVG(satisfaction_rating),
        'total_tickets', COUNT(*),
        'resolved_tickets', COUNT(CASE WHEN status = 'resolved' THEN 1 END)
      )
      FROM tickets t
      WHERE t.team_id = p_team_id
      AND t.created_at >= v_start_date
    )
    WHEN 'workload' THEN (
      SELECT jsonb_build_object(
        'agents_count', COUNT(DISTINCT agent_id),
        'tickets_per_agent', COUNT(*)::FLOAT / COUNT(DISTINCT agent_id)::FLOAT,
        'open_tickets', COUNT(CASE WHEN status = 'open' THEN 1 END),
        'workload_distribution', jsonb_agg(
          jsonb_build_object(
            'agent_id', agent_id,
            'assigned_tickets', COUNT(*)
          )
        )
      )
      FROM tickets t
      WHERE t.team_id = p_team_id
      AND t.created_at >= v_start_date
    )
    ELSE jsonb_build_object(
      'error', 'Invalid metric type'
    )
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze customer data
CREATE OR REPLACE FUNCTION analyze_customer_data(
  p_customer_id TEXT,
  p_analysis_type TEXT,
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

  -- Get analysis based on type
  v_result := CASE p_analysis_type
    WHEN 'behavior' THEN (
      SELECT jsonb_build_object(
        'ticket_frequency', COUNT(*)::FLOAT / EXTRACT(DAYS FROM (NOW() - v_start_date)),
        'common_issues', jsonb_agg(DISTINCT category),
        'average_priority', AVG(
          CASE priority
            WHEN 'low' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'high' THEN 3
            WHEN 'urgent' THEN 4
            ELSE 0
          END
        ),
        'satisfaction_trend', AVG(satisfaction_rating)
      )
      FROM tickets t
      WHERE t.customer_id = p_customer_id
      AND t.created_at >= v_start_date
    )
    WHEN 'engagement' THEN (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'response_rate', COUNT(CASE WHEN customer_response_time IS NOT NULL THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'average_response_time', AVG(EXTRACT(EPOCH FROM customer_response_time)),
        'feedback_given', COUNT(CASE WHEN satisfaction_rating IS NOT NULL THEN 1 END)
      )
      FROM tickets t
      WHERE t.customer_id = p_customer_id
      AND t.created_at >= v_start_date
    )
    ELSE jsonb_build_object(
      'error', 'Invalid analysis type'
    )
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent performance
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
        'tickets_resolved', COUNT(CASE WHEN status = 'resolved' THEN 1 END),
        'resolution_rate', COUNT(CASE WHEN status = 'resolved' THEN 1 END)::FLOAT / COUNT(*)::FLOAT
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

-- Function to optimize workload distribution
CREATE OR REPLACE FUNCTION optimize_workload_distribution(
  p_team_id TEXT,
  p_optimization_type TEXT,
  p_constraints JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Get current workload distribution
  WITH agent_stats AS (
    SELECT 
      t.assigned_to,
      COUNT(*) as current_tickets,
      AVG(
        CASE priority
          WHEN 'low' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'high' THEN 3
          WHEN 'urgent' THEN 4
          ELSE 0
        END
      ) as avg_priority,
      array_agg(DISTINCT category) as skills
    FROM tickets t
    WHERE t.team_id = p_team_id
    AND t.status = 'open'
    GROUP BY t.assigned_to
  )
  -- Calculate optimization recommendations
  SELECT jsonb_build_object(
    'current_distribution', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'agent_id', assigned_to,
          'current_load', current_tickets,
          'avg_priority', avg_priority,
          'skills', skills
        )
      )
      FROM agent_stats
    ),
    'recommendations', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'agent_id', assigned_to,
          'recommended_load', 
          CASE 
            WHEN p_optimization_type = 'balanced'
            THEN ROUND(AVG(current_tickets) OVER())::INT
            WHEN p_optimization_type = 'priority_based'
            THEN ROUND(current_tickets * (1 + (avg_priority - 2.5) * 0.2))::INT
            ELSE current_tickets
          END,
          'transfer_tickets', 
          CASE 
            WHEN current_tickets > ROUND(AVG(current_tickets) OVER())::INT
            THEN current_tickets - ROUND(AVG(current_tickets) OVER())::INT
            ELSE 0
          END
        )
      )
      FROM agent_stats
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql; 