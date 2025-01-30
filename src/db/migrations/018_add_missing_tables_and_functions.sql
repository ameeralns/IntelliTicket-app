-- Add missing tables and functions for AI tools

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    name TEXT NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sla_policies table
CREATE TABLE IF NOT EXISTS public.sla_policies (
    sla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES auth.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    response_time_hours INTEGER NOT NULL,
    resolution_time_hours INTEGER NOT NULL,
    priority_levels JSONB NOT NULL,
    business_hours JSONB,
    conditions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_skills table
CREATE TABLE IF NOT EXISTS public.agent_skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(agent_id),
    skill_name TEXT NOT NULL,
    proficiency_level INTEGER NOT NULL CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, skill_name)
);

-- Drop and recreate knowledge_articles table with correct reference
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.knowledge_articles CASCADE;

-- Create knowledge_articles table
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
    article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(organization_id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[],
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.agents(agent_id),
    updated_by UUID REFERENCES public.agents(agent_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing function if exists with any parameter combination
DROP FUNCTION IF EXISTS manage_knowledge_base(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS manage_knowledge_base(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS manage_knowledge_base(TEXT, TEXT);
DROP FUNCTION IF EXISTS manage_knowledge_base(TEXT);

-- Create function to manage knowledge base
CREATE OR REPLACE FUNCTION manage_knowledge_base(
    p_action TEXT,
    p_query TEXT,
    p_category TEXT,
    p_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_tags TEXT[];
BEGIN
    -- Convert tags from JSONB array to text array
    IF p_data ? 'tags' THEN
        SELECT array_agg(value::text)
        INTO v_tags
        FROM jsonb_array_elements_text(p_data->'tags');
    END IF;

    CASE p_action
        WHEN 'search' THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'article_id', article_id,
                    'title', title,
                    'content', content,
                    'category', category,
                    'tags', tags
                )
            )
            INTO v_result
            FROM knowledge_articles
            WHERE 
                (p_category IS NULL OR category = p_category)
                AND (
                    p_query IS NULL 
                    OR title ILIKE '%' || p_query || '%'
                    OR content ILIKE '%' || p_query || '%'
                    OR p_query = ANY(tags)
                );

        WHEN 'create' THEN
            INSERT INTO knowledge_articles (
                organization_id,
                title,
                content,
                category,
                tags,
                is_published,
                created_by
            )
            VALUES (
                (p_data->>'organization_id')::UUID,
                p_data->>'title',
                p_data->>'content',
                p_data->>'category',
                v_tags,
                COALESCE((p_data->>'is_published')::BOOLEAN, false),
                (p_data->>'created_by')::UUID
            )
            RETURNING jsonb_build_object(
                'article_id', article_id,
                'title', title,
                'category', category
            ) INTO v_result;

        WHEN 'update' THEN
            UPDATE knowledge_articles
            SET
                title = COALESCE(p_data->>'title', title),
                content = COALESCE(p_data->>'content', content),
                category = COALESCE(p_data->>'category', category),
                tags = COALESCE(v_tags, tags),
                is_published = COALESCE((p_data->>'is_published')::BOOLEAN, is_published),
                updated_by = (p_data->>'updated_by')::UUID,
                updated_at = NOW()
            WHERE article_id = (p_data->>'article_id')::UUID
            RETURNING jsonb_build_object(
                'article_id', article_id,
                'title', title,
                'category', category
            ) INTO v_result;

        WHEN 'delete' THEN
            DELETE FROM knowledge_articles
            WHERE article_id = (p_data->>'article_id')::UUID
            RETURNING jsonb_build_object(
                'article_id', article_id,
                'status', 'deleted'
            ) INTO v_result;

        ELSE
            RAISE EXCEPTION 'Invalid action: %', p_action;
    END CASE;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Drop existing SLA management function if exists with any parameter combination
DROP FUNCTION IF EXISTS manage_slas CASCADE;
DROP FUNCTION IF EXISTS public.manage_slas CASCADE;
DROP FUNCTION IF EXISTS manage_slas(TEXT, UUID, JSONB) CASCADE;

-- Create function to manage SLAs
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
                organization_id,
                name,
                description,
                response_time_hours,
                resolution_time_hours,
                priority_levels,
                business_hours,
                conditions
            )
            VALUES (
                (p_sla_data->>'organization_id')::UUID,
                p_sla_data->>'name',
                p_sla_data->>'description',
                (p_sla_data->>'response_time_hours')::INTEGER,
                (p_sla_data->>'resolution_time_hours')::INTEGER,
                p_sla_data->'priority_levels',
                p_sla_data->'business_hours',
                p_sla_data->'conditions'
            )
            RETURNING jsonb_build_object(
                'sla_id', sla_id,
                'name', name,
                'response_time_hours', response_time_hours,
                'resolution_time_hours', resolution_time_hours
            ) INTO v_result;

        WHEN 'update' THEN
            UPDATE sla_policies
            SET
                name = COALESCE(p_sla_data->>'name', name),
                description = COALESCE(p_sla_data->>'description', description),
                response_time_hours = COALESCE((p_sla_data->>'response_time_hours')::INTEGER, response_time_hours),
                resolution_time_hours = COALESCE((p_sla_data->>'resolution_time_hours')::INTEGER, resolution_time_hours),
                priority_levels = COALESCE(p_sla_data->'priority_levels', priority_levels),
                business_hours = COALESCE(p_sla_data->'business_hours', business_hours),
                conditions = COALESCE(p_sla_data->'conditions', conditions),
                updated_at = NOW()
            WHERE sla_id = p_sla_id::UUID
            RETURNING jsonb_build_object(
                'sla_id', sla_id,
                'name', name,
                'response_time_hours', response_time_hours,
                'resolution_time_hours', resolution_time_hours
            ) INTO v_result;

        WHEN 'delete' THEN
            DELETE FROM sla_policies
            WHERE sla_id = p_sla_id::UUID
            RETURNING jsonb_build_object(
                'sla_id', sla_id,
                'status', 'deleted'
            ) INTO v_result;

        WHEN 'get' THEN
            SELECT jsonb_build_object(
                'sla_id', sla_id,
                'name', name,
                'description', description,
                'response_time_hours', response_time_hours,
                'resolution_time_hours', resolution_time_hours,
                'priority_levels', priority_levels,
                'business_hours', business_hours,
                'conditions', conditions
            )
            INTO v_result
            FROM sla_policies
            WHERE sla_id = p_sla_id::UUID;

        ELSE
            RAISE EXCEPTION 'Invalid action: %', p_action;
    END CASE;

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_rules_org ON public.automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON public.automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_sla_policies_org ON public.sla_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON public.agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_org ON public.knowledge_articles(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published ON public.knowledge_articles(is_published);

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view automation rules in their organization" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can manage automation rules in their organization" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can view SLA policies in their organization" ON public.sla_policies;
DROP POLICY IF EXISTS "Users can manage SLA policies in their organization" ON public.sla_policies;
DROP POLICY IF EXISTS "Users can view agent skills in their organization" ON public.agent_skills;
DROP POLICY IF EXISTS "Users can manage agent skills in their organization" ON public.agent_skills;
DROP POLICY IF EXISTS "Users can view knowledge articles in their organization" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can manage knowledge articles in their organization" ON public.knowledge_articles;

-- Create RLS policies
CREATE POLICY "Users can view automation rules in their organization" ON public.automation_rules
    FOR SELECT TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can manage automation rules in their organization" ON public.automation_rules
    FOR ALL TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
    WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can view SLA policies in their organization" ON public.sla_policies
    FOR SELECT TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can manage SLA policies in their organization" ON public.sla_policies
    FOR ALL TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
    WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can view agent skills in their organization" ON public.agent_skills
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.agent_id = agent_skills.agent_id
            AND a.organization_id = (auth.jwt() ->> 'organization_id')::UUID
        )
    );

CREATE POLICY "Users can manage agent skills in their organization" ON public.agent_skills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.agent_id = agent_skills.agent_id
            AND a.organization_id = (auth.jwt() ->> 'organization_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            WHERE a.agent_id = agent_skills.agent_id
            AND a.organization_id = (auth.jwt() ->> 'organization_id')::UUID
        )
    );

CREATE POLICY "Users can view knowledge articles in their organization" ON public.knowledge_articles
    FOR SELECT TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can manage knowledge articles in their organization" ON public.knowledge_articles
    FOR ALL TO authenticated
    USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID)
    WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Grant permissions
GRANT ALL ON public.automation_rules TO authenticated;
GRANT ALL ON public.sla_policies TO authenticated;
GRANT ALL ON public.agent_skills TO authenticated;
GRANT ALL ON public.knowledge_articles TO authenticated;
GRANT EXECUTE ON FUNCTION manage_knowledge_base TO authenticated;
GRANT EXECUTE ON FUNCTION manage_slas TO authenticated;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_automation_rules_modtime ON public.automation_rules;
DROP TRIGGER IF EXISTS update_sla_policies_modtime ON public.sla_policies;
DROP TRIGGER IF EXISTS update_agent_skills_modtime ON public.agent_skills;
DROP TRIGGER IF EXISTS update_knowledge_articles_modtime ON public.knowledge_articles;

-- Add triggers for updated_at
CREATE TRIGGER update_automation_rules_modtime
    BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_policies_modtime
    BEFORE UPDATE ON public.sla_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_skills_modtime
    BEFORE UPDATE ON public.agent_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_articles_modtime
    BEFORE UPDATE ON public.knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 