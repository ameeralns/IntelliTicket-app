-- Create extended functions for admin intelligence tools

-- Function to get organization-wide metrics
CREATE OR REPLACE FUNCTION get_organization_metrics(
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
    WHEN 'overview' THEN (
      SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'active_tickets', COUNT(CASE WHEN status = 'open' OR status = 'in_progress' THEN 1 END),
        'total_agents', COUNT(DISTINCT assigned_to),
        'total_teams', COUNT(DISTINCT team_id),
        'average_resolution_time', AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))),
        'customer_satisfaction', AVG(satisfaction_rating),
        'tickets_by_priority', jsonb_object_agg(priority, COUNT(*)),
        'tickets_by_status', jsonb_object_agg(status, COUNT(*))
      )
      FROM tickets t
      WHERE t.created_at >= v_start_date
    )
    WHEN 'performance' THEN (
      SELECT jsonb_build_object(
        'resolution_rate', COUNT(CASE WHEN status = 'resolved' THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'first_response_time', AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))),
        'sla_compliance', COUNT(CASE WHEN sla_breached = false THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'reopened_rate', COUNT(CASE WHEN reopened_count > 0 THEN 1 END)::FLOAT / COUNT(*)::FLOAT,
        'escalation_rate', COUNT(CASE WHEN escalated = true THEN 1 END)::FLOAT / COUNT(*)::FLOAT
      )
      FROM tickets t
      WHERE t.created_at >= v_start_date
    )
    ELSE jsonb_build_object(
      'error', 'Invalid metric type'
    )
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to manage tickets in bulk
CREATE OR REPLACE FUNCTION manage_tickets_bulk(
  p_ticket_ids TEXT[],
  p_action TEXT,
  p_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_ticket_id TEXT;
BEGIN
  -- Initialize result
  v_result := jsonb_build_object(
    'success', true,
    'processed', 0,
    'failed', 0,
    'details', '[]'::jsonb
  );

  -- Process each ticket
  FOREACH v_ticket_id IN ARRAY p_ticket_ids
  LOOP
    BEGIN
      CASE p_action
        WHEN 'update_status' THEN
          UPDATE tickets
          SET status = p_data->>'status'
          WHERE ticket_id = v_ticket_id;
        
        WHEN 'update_priority' THEN
          UPDATE tickets
          SET priority = p_data->>'priority'
          WHERE ticket_id = v_ticket_id;
        
        WHEN 'assign' THEN
          UPDATE tickets
          SET 
            agent_id = (p_data->>'agent_id')::UUID,
            status = 'Assigned',
            assigned_at = NOW()
          WHERE ticket_id = v_ticket_id;
        
        WHEN 'update_sla' THEN
          UPDATE tickets
          SET 
            sla_due_at = (p_data->>'sla_hours')::interval + NOW(),
            sla_policy = p_data->>'sla_policy'
          WHERE ticket_id = v_ticket_id;
        
        ELSE
          RAISE EXCEPTION 'Invalid action: %', p_action;
      END CASE;

      -- Update success count
      v_result := jsonb_set(
        v_result,
        '{processed}',
        to_jsonb(COALESCE((v_result->>'processed')::int, 0) + 1)
      );

    EXCEPTION WHEN OTHERS THEN
      -- Update failure count and details
      v_result := jsonb_set(
        v_result,
        '{failed}',
        to_jsonb(COALESCE((v_result->>'failed')::int, 0) + 1)
      );
      v_result := jsonb_set(
        v_result,
        '{details}',
        (v_result->'details') || jsonb_build_object(
          'ticket_id', v_ticket_id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to manage team structure and assignments
CREATE OR REPLACE FUNCTION manage_team(
  p_team_id TEXT,
  p_action TEXT,
  p_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  CASE p_action
    WHEN 'add_member' THEN
      INSERT INTO team_members (team_id, agent_id, role)
      VALUES (p_team_id, p_data->>'agent_id', p_data->>'role');
      
    WHEN 'remove_member' THEN
      DELETE FROM team_members
      WHERE team_id = p_team_id AND agent_id = p_data->>'agent_id';
      
    WHEN 'update_role' THEN
      UPDATE team_members
      SET role = p_data->>'role'
      WHERE team_id = p_team_id AND agent_id = p_data->>'agent_id';
      
    WHEN 'update_settings' THEN
      UPDATE teams
      SET 
        settings = p_data,
        updated_at = NOW()
      WHERE team_id = p_team_id;
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  -- Get updated team information
  SELECT jsonb_build_object(
    'team_id', t.team_id,
    'name', t.name,
    'settings', t.settings,
    'members', jsonb_agg(
      jsonb_build_object(
        'agent_id', tm.agent_id,
        'role', tm.role
      )
    )
  )
  INTO v_result
  FROM teams t
  LEFT JOIN team_members tm ON t.team_id = tm.team_id
  WHERE t.team_id = p_team_id
  GROUP BY t.team_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to manage knowledge base
CREATE OR REPLACE FUNCTION manage_knowledge_base(
  p_action TEXT,
  p_query TEXT,
  p_category TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  CASE p_action
    WHEN 'search' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'article_id', article_id,
          'title', title,
          'content', content,
          'category', category,
          'relevance', ts_rank(search_vector, to_tsquery(p_query))
        )
      )
      INTO v_result
      FROM knowledge_base
      WHERE 
        search_vector @@ to_tsquery(p_query)
        AND (p_category IS NULL OR category = p_category)
      ORDER BY ts_rank(search_vector, to_tsquery(p_query)) DESC;
      
    WHEN 'get_categories' THEN
      SELECT jsonb_agg(DISTINCT category)
      INTO v_result
      FROM knowledge_base;
      
    WHEN 'get_stats' THEN
      SELECT jsonb_build_object(
        'total_articles', COUNT(*),
        'categories', COUNT(DISTINCT category),
        'articles_by_category', jsonb_object_agg(category, COUNT(*))
      )
      INTO v_result
      FROM knowledge_base;
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to manage automation rules
CREATE OR REPLACE FUNCTION manage_automation_rules(
  p_action TEXT,
  p_rule_id TEXT,
  p_rule_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  CASE p_action
    WHEN 'create' THEN
      INSERT INTO automation_rules (
        name,
        conditions,
        actions,
        priority,
        is_active
      )
      VALUES (
        p_rule_data->>'name',
        p_rule_data->'conditions',
        p_rule_data->'actions',
        (p_rule_data->>'priority')::int,
        COALESCE((p_rule_data->>'is_active')::boolean, true)
      )
      RETURNING jsonb_build_object(
        'rule_id', rule_id,
        'name', name,
        'conditions', conditions,
        'actions', actions,
        'priority', priority,
        'is_active', is_active
      ) INTO v_result;
      
    WHEN 'update' THEN
      UPDATE automation_rules
      SET
        name = COALESCE(p_rule_data->>'name', name),
        conditions = COALESCE(p_rule_data->'conditions', conditions),
        actions = COALESCE(p_rule_data->'actions', actions),
        priority = COALESCE((p_rule_data->>'priority')::int, priority),
        is_active = COALESCE((p_rule_data->>'is_active')::boolean, is_active),
        updated_at = NOW()
      WHERE rule_id = p_rule_id
      RETURNING jsonb_build_object(
        'rule_id', rule_id,
        'name', name,
        'conditions', conditions,
        'actions', actions,
        'priority', priority,
        'is_active', is_active
      ) INTO v_result;
      
    WHEN 'delete' THEN
      DELETE FROM automation_rules
      WHERE rule_id = p_rule_id
      RETURNING jsonb_build_object(
        'rule_id', rule_id,
        'status', 'deleted'
      ) INTO v_result;
      
    WHEN 'get_all' THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'rule_id', rule_id,
          'name', name,
          'conditions', conditions,
          'actions', actions,
          'priority', priority,
          'is_active', is_active
        )
      )
      INTO v_result
      FROM automation_rules
      ORDER BY priority DESC;
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to manage SLAs
CREATE OR REPLACE FUNCTION manage_slas(
  p_action TEXT,
  p_sla_id TEXT,
  p_sla_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  CASE p_action
    WHEN 'create' THEN
      INSERT INTO sla_policies (
        name,
        description,
        response_time_hours,
        resolution_time_hours,
        priority_levels,
        business_hours,
        conditions
      )
      VALUES (
        p_sla_data->>'name',
        p_sla_data->>'description',
        (p_sla_data->>'response_time_hours')::int,
        (p_sla_data->>'resolution_time_hours')::int,
        p_sla_data->'priority_levels',
        p_sla_data->'business_hours',
        p_sla_data->'conditions'
      )
      RETURNING jsonb_build_object(
        'sla_id', sla_id,
        'name', name,
        'description', description,
        'response_time_hours', response_time_hours,
        'resolution_time_hours', resolution_time_hours,
        'priority_levels', priority_levels,
        'business_hours', business_hours,
        'conditions', conditions
      ) INTO v_result;
      
    WHEN 'update' THEN
      UPDATE sla_policies
      SET
        name = COALESCE(p_sla_data->>'name', name),
        description = COALESCE(p_sla_data->>'description', description),
        response_time_hours = COALESCE((p_sla_data->>'response_time_hours')::int, response_time_hours),
        resolution_time_hours = COALESCE((p_sla_data->>'resolution_time_hours')::int, resolution_time_hours),
        priority_levels = COALESCE(p_sla_data->'priority_levels', priority_levels),
        business_hours = COALESCE(p_sla_data->'business_hours', business_hours),
        conditions = COALESCE(p_sla_data->'conditions', conditions),
        updated_at = NOW()
      WHERE sla_id = p_sla_id
      RETURNING jsonb_build_object(
        'sla_id', sla_id,
        'name', name,
        'description', description,
        'response_time_hours', response_time_hours,
        'resolution_time_hours', resolution_time_hours,
        'priority_levels', priority_levels,
        'business_hours', business_hours,
        'conditions', conditions
      ) INTO v_result;
      
    WHEN 'get_breaches' THEN
      SELECT jsonb_build_object(
        'total_breaches', COUNT(*),
        'breaches_by_priority', jsonb_object_agg(priority, COUNT(*)),
        'breaches_by_team', jsonb_object_agg(team_id, COUNT(*))
      )
      INTO v_result
      FROM tickets
      WHERE sla_breached = true
      AND created_at >= NOW() - INTERVAL '30 days';
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql; 