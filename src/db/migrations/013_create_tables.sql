-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

CREATE INDEX IF NOT EXISTS idx_tickets_organization_id ON public.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON public.tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);

-- Add RLS policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Users can view customers in their organization" ON public.customers
    FOR SELECT TO authenticated
    USING (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY "Users can insert customers in their organization" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY "Users can update customers in their organization" ON public.customers
    FOR UPDATE TO authenticated
    USING (organization_id = auth.jwt() ->> 'organization_id'::text)
    WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);

-- Policies for tickets
CREATE POLICY "Users can view tickets in their organization" ON public.tickets
    FOR SELECT TO authenticated
    USING (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY "Users can insert tickets in their organization" ON public.tickets
    FOR INSERT TO authenticated
    WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);

CREATE POLICY "Users can update tickets in their organization" ON public.tickets
    FOR UPDATE TO authenticated
    USING (organization_id = auth.jwt() ->> 'organization_id'::text)
    WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.tickets TO authenticated; 