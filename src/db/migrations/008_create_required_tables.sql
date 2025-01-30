-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for organizations
ALTER TABLE auth.organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND schemaname = 'auth'
    ) THEN
        CREATE POLICY "Users can view their organizations"
            ON auth.organizations
            FOR SELECT
            TO authenticated
            USING (id = (auth.jwt() ->> 'organization_id')::UUID);
    END IF;
END
$$;

-- Create ai_chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES auth.organizations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    command TEXT,
    parsed_command JSONB,
    result JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for ai_chat_sessions
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'ai_chat_sessions' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY "Users can view their organization's chat sessions"
            ON public.ai_chat_sessions
            FOR SELECT
            TO authenticated
            USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

        CREATE POLICY "Users can insert chat sessions for their organization"
            ON public.ai_chat_sessions
            FOR INSERT
            TO authenticated
            WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);
    END IF;
END
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_org_id ON public.ai_chat_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON public.ai_chat_sessions(created_at DESC);

-- Insert a default organization if none exists
INSERT INTO auth.organizations (id, name)
SELECT 
    'd6083c1b-45e4-4319-adfb-a7e614614bc9'::UUID,
    'Default Organization'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.organizations 
    WHERE id = 'd6083c1b-45e4-4319-adfb-a7e614614bc9'::UUID
); 