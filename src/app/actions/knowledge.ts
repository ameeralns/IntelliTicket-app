'use server';

import { createClient } from '@supabase/supabase-js';
import { KnowledgeEmbeddingService } from '@/lib/services/KnowledgeEmbeddingService';
import { Database } from '@/lib/types/database.types';
import { Document } from '@langchain/core/documents';

export async function searchKnowledgeBase(
  organizationId: string,
  query: string
): Promise<Document[]> {
  try {
    const embeddingService = new KnowledgeEmbeddingService(organizationId);
    const results = await embeddingService.searchSimilarContent(query);
    return results;
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    throw new Error('Failed to search knowledge base');
  }
} 