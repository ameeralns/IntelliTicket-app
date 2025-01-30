CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
  query_embedding vector(1536),
  filter_organization_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  content_chunk text,
  article_id uuid,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.content as content_chunk,
    kb.article_id,
    1 - (kb.embedding <=> query_embedding) as similarity,
    kb.metadata
  FROM kb_embeddings kb
  WHERE kb.organization_id = filter_organization_id
  AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
