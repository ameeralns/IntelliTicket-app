-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table for customer embeddings
CREATE TABLE IF NOT EXISTS public.customer_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(customer_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES auth.organizations(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI's text-embedding-ada-002 uses 1536 dimensions
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);

-- Create a table for agent embeddings
CREATE TABLE IF NOT EXISTS public.agent_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(agent_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES auth.organizations(id) ON DELETE CASCADE,
    embedding vector(1536),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_embeddings_org ON public.customer_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_org ON public.agent_embeddings(organization_id);

-- Add RLS policies
ALTER TABLE public.customer_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies for customer embeddings
CREATE POLICY "Users can view customer embeddings in their organization" ON public.customer_embeddings
    FOR SELECT TO authenticated
    USING (organization_id = (auth.jwt()->'user_metadata'->>'organization_id')::UUID);

CREATE POLICY "Users can insert customer embeddings in their organization" ON public.customer_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = (auth.jwt()->'user_metadata'->>'organization_id')::UUID);

-- Policies for agent embeddings
CREATE POLICY "Users can view agent embeddings in their organization" ON public.agent_embeddings
    FOR SELECT TO authenticated
    USING (organization_id = (auth.jwt()->'user_metadata'->>'organization_id')::UUID);

CREATE POLICY "Users can insert agent embeddings in their organization" ON public.agent_embeddings
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = (auth.jwt()->'user_metadata'->>'organization_id')::UUID);

-- Function to search customers by similarity
CREATE OR REPLACE FUNCTION public.search_customers(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    org_id UUID;
BEGIN
    -- Get organization ID from JWT with proper casting
    org_id := (auth.jwt()->'user_metadata'->>'organization_id')::UUID;
    
    RETURN QUERY
    SELECT 
        c.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        1 - (ce.embedding <=> query_embedding) as similarity
    FROM public.customer_embeddings ce
    JOIN public.customers c ON c.customer_id = ce.customer_id
    WHERE ce.organization_id = org_id
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to search agents by similarity
CREATE OR REPLACE FUNCTION public.search_agents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    agent_id UUID,
    agent_name TEXT,
    agent_email TEXT,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    org_id UUID;
BEGIN
    -- Get organization ID from JWT with proper casting
    org_id := (auth.jwt()->'user_metadata'->>'organization_id')::UUID;
    
    RETURN QUERY
    SELECT 
        a.agent_id,
        a.name as agent_name,
        a.email as agent_email,
        1 - (ae.embedding <=> query_embedding) as similarity
    FROM public.agent_embeddings ae
    JOIN public.agents a ON a.agent_id = ae.agent_id
    WHERE ae.organization_id = org_id
    AND 1 - (ae.embedding <=> query_embedding) > match_threshold
    ORDER BY ae.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.customer_embeddings TO authenticated;
GRANT ALL ON public.agent_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_customers TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_agents TO authenticated; 