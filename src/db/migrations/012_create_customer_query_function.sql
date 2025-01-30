-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_customer_details;

-- Create the function to get customer details
CREATE OR REPLACE FUNCTION public.get_customer_details()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  org_id UUID;
  auth_user jsonb;
BEGIN
  -- Get authenticated user
  auth_user := auth.jwt();
  
  -- Get organization ID from user metadata
  org_id := COALESCE(
    (auth_user->'user_metadata'->>'organization_id')::UUID,
    (auth_user->>'organization_id')::UUID
  );
  
  IF org_id IS NULL THEN
    -- Try to get organization ID from auth.users table
    SELECT organization_id INTO org_id
    FROM auth.users
    WHERE id = (auth_user->>'sub')::UUID;
    
    IF org_id IS NULL THEN
      RAISE EXCEPTION 'Could not determine organization ID. Please ensure user is properly configured.';
    END IF;
  END IF;

  -- Get total customer count and other summary statistics
  SELECT jsonb_build_object(
    'total_count', COALESCE((SELECT COUNT(*) FROM customers WHERE organization_id = org_id), 0),
    'statistics', jsonb_build_object(
      'total_tickets', COALESCE((
        SELECT COUNT(*) 
        FROM tickets t 
        JOIN customers c ON t.customer_id = c.customer_id 
        WHERE c.organization_id = org_id
      ), 0),
      'avg_tickets_per_customer', COALESCE(
        (SELECT ROUND(CAST(COUNT(t.*)::float / NULLIF(COUNT(DISTINCT c.customer_id), 0) AS numeric), 2)
        FROM customers c
        LEFT JOIN tickets t ON t.customer_id = c.customer_id
        WHERE c.organization_id = org_id),
        0
      ),
      'tickets_by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT t.status, COUNT(*) as count
          FROM tickets t
          JOIN customers c ON t.customer_id = c.customer_id
          WHERE c.organization_id = org_id
          GROUP BY t.status
        ) status_counts
      )
    ),
    'organization_id', org_id,
    'debug_info', jsonb_build_object(
      'user_id', (auth_user->>'sub'),
      'user_metadata', (auth_user->'user_metadata')
    )
  ) INTO result;

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error information with more context
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'debug_info', jsonb_build_object(
      'user_id', (auth_user->>'sub'),
      'user_metadata', (auth_user->'user_metadata')
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_customer_details TO authenticated;

-- Create policy for the function
DO $$ 
BEGIN
  -- Revoke execute from public
  REVOKE EXECUTE ON FUNCTION public.get_customer_details FROM public;
  
  -- Grant execute to authenticated users
  GRANT EXECUTE ON FUNCTION public.get_customer_details TO authenticated;
END $$; 