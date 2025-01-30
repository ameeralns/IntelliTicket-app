-- Create the process_admin_command function
CREATE OR REPLACE FUNCTION public.process_admin_command(command_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  command_type text;
  confidence_score float;
BEGIN
  -- Basic command type detection
  command_type := CASE 
    WHEN command_text ~* 'assign|reassign' THEN 'ASSIGN_TICKET'
    WHEN command_text ~* 'workload|load|capacity' THEN 'QUERY_WORKLOAD'
    WHEN command_text ~* 'performance|metrics|stats' THEN 'QUERY_PERFORMANCE'
    WHEN command_text ~* 'customer|client' THEN 'QUERY_CUSTOMER'
    WHEN command_text ~* 'agent|team member' THEN 'QUERY_AGENT'
    WHEN command_text ~* 'update|change|modify' THEN 'UPDATE_TICKET'
    WHEN command_text ~* 'feedback|satisfaction|rating' THEN 'ANALYZE_FEEDBACK'
    ELSE 'UNKNOWN'
  END;

  -- Calculate confidence score based on keyword matches
  confidence_score := CASE 
    WHEN command_type = 'UNKNOWN' THEN 0.3
    WHEN command_text ~* format('\\y%s\\y', command_type) THEN 0.9
    ELSE 0.7
  END;

  -- Construct result JSON
  result := jsonb_build_object(
    'command_type', command_type,
    'confidence_score', confidence_score,
    'original_text', command_text,
    'timestamp', now()
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_admin_command(text) TO authenticated;

-- Create RLS policy
ALTER FUNCTION public.process_admin_command(text) SET search_path = public; 