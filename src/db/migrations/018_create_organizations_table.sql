-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_tier TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT true
);

-- Add RLS policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own organization
CREATE POLICY "Users can view their own organization"
    ON public.organizations
    FOR SELECT
    USING (
        id IN (
            SELECT (auth.jwt() ->> 'user_metadata')::jsonb ->> 'organization_id'::text
        )
    );

-- Create function to get organization details
CREATE OR REPLACE FUNCTION public.get_organization_details(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    created_at TIMESTAMPTZ,
    settings JSONB,
    subscription_tier TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.created_at,
        o.settings,
        o.subscription_tier
    FROM public.organizations o
    WHERE o.id = (
        SELECT (u.raw_user_meta_data->>'organization_id')::UUID
        FROM auth.users u
        WHERE u.id = p_user_id
    )
    AND o.is_active = true;
END;
$$; 