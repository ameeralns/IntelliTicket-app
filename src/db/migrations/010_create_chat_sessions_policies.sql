-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can view their organization's chat sessions" ON public.ai_chat_sessions;

-- Enable RLS on the table
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting records
CREATE POLICY "Users can insert their own chat sessions"
  ON public.ai_chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

-- Create policy for viewing records
CREATE POLICY "Users can view their organization's chat sessions"
  ON public.ai_chat_sessions
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

-- Grant necessary permissions
GRANT ALL ON public.ai_chat_sessions TO authenticated; 