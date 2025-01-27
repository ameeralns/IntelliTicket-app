-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types
DO $$ BEGIN
    CREATE TYPE AgentRole AS ENUM ('admin', 'agent', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS kb_embeddings;
DROP TABLE IF EXISTS ai_agents;

-- Create the ai_agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  agent_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role AgentRole NOT NULL DEFAULT 'customer',
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the kb_embeddings table
CREATE TABLE IF NOT EXISTS kb_embeddings (
  embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES knowledge_articles(article_id),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_article_id ON kb_embeddings(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_organization_id ON kb_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_embedding ON kb_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
CREATE TRIGGER update_ai_agents_updated_at
    BEFORE UPDATE ON ai_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_embeddings_updated_at ON kb_embeddings;
CREATE TRIGGER update_kb_embeddings_updated_at
    BEFORE UPDATE ON kb_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_embeddings;
DROP FUNCTION IF EXISTS match_knowledge_embeddings;

-- Create similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  content_chunk TEXT,
  article_id UUID,
  similarity float,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.content as content_chunk,
    e.article_id,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata
  FROM kb_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE kb_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS kb_embeddings_isolation_policy ON kb_embeddings;
CREATE POLICY kb_embeddings_isolation_policy ON kb_embeddings
    USING (organization_id = (
        SELECT organization_id FROM ai_agents WHERE agent_id = auth.uid()
    ));

DROP POLICY IF EXISTS ai_agents_isolation_policy ON ai_agents;
CREATE POLICY ai_agents_isolation_policy ON ai_agents
    USING (organization_id = (
        SELECT organization_id FROM ai_agents WHERE agent_id = auth.uid()
    ));

-- Grant permissions
GRANT SELECT ON kb_embeddings TO authenticated;
GRANT SELECT ON ai_agents TO authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge_embeddings TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE kb_embeddings IS 'Stores vector embeddings for knowledge base articles';
COMMENT ON TABLE ai_agents IS 'Configuration for AI agents per organization';
COMMENT ON FUNCTION match_knowledge_embeddings IS 'Performs similarity search on knowledge base embeddings'; 