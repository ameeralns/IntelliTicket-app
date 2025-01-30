-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_customer_details;

-- Create the function to get customer details
CREATE OR REPLACE FUNCTION public.get_customer_details(
  query_params JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Get total customer count and other summary statistics
  SELECT jsonb_build_object(
    'total_count', (SELECT COUNT(*) FROM customers),
    'active_count', (SELECT COUNT(*) FROM customers WHERE status = 'active'),
    'statistics', jsonb_build_object(
      'total_tickets', (SELECT COUNT(*) FROM tickets),
      'avg_tickets_per_customer', (
        SELECT ROUND(CAST(COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM customers), 0) AS numeric), 2)
        FROM tickets
      )
    )
  ) INTO result;

  -- Add organization context
  result = result || jsonb_build_object(
    'organization_id', auth.jwt() ->> 'organization_id'
  );

  RETURN result;
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