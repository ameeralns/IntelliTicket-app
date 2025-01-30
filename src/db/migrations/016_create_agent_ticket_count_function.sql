-- Drop existing function first
DROP FUNCTION IF EXISTS get_agents_with_ticket_counts(UUID);

-- Function to get agents with their ticket counts and team info
CREATE OR REPLACE FUNCTION get_agents_with_ticket_counts(p_organization_id UUID)
RETURNS TABLE (
  agent_id UUID,
  name VARCHAR(100),
  email VARCHAR(100),
  role VARCHAR(50),
  team_name VARCHAR(100),
  ticket_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH active_tickets AS (
    SELECT 
      t.agent_id,
      COUNT(*) as active_count
    FROM tickets t
    WHERE 
      t.organization_id = p_organization_id
      AND t.status NOT IN ('Resolved', 'Closed')
      AND t.agent_id IS NOT NULL
    GROUP BY t.agent_id
  )
  SELECT 
    a.agent_id,
    a.name,
    a.email,
    a.role,
    COALESCE(t.name, 'Unassigned'::VARCHAR(100)) as team_name,
    COALESCE(at.active_count, 0) as ticket_count
  FROM agents a
  LEFT JOIN teams t ON a.team_id = t.team_id
  LEFT JOIN active_tickets at ON a.agent_id = at.agent_id
  WHERE 
    a.organization_id = p_organization_id
    AND a.role != 'admin'  -- Exclude admin users
  ORDER BY 
    COALESCE(at.active_count, 0) ASC,  -- Order by ticket count ascending (least to most)
    a.name ASC;           -- Then alphabetically by name
END;
$$ LANGUAGE plpgsql; 