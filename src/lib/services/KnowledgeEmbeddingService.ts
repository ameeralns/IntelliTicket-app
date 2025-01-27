import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { Database } from '@/lib/types/database.types';

export interface SearchResult {
  content: string;
  metadata: {
    title: string;
    [key: string]: any;
  };
  similarity: number;
}

interface EmbeddingResult {
  content_chunk: string;
  article_id: string;
  similarity: number;
  metadata: Record<string, any>;
}

export class KnowledgeEmbeddingService {
  private supabase: SupabaseClient<Database>;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API key');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }

  async searchSimilarContent(query: string, organizationId: string): Promise<SearchResult[]> {
    try {
      console.log(`Searching for content matching query: "${query}" for organization: ${organizationId}`);

      // Generate embedding for the query
      const embedding = await this.embeddings.embedQuery(query);
      
      // Call the match_embeddings function with organization filter
      const { data: results, error } = await this.supabase.rpc('match_knowledge_embeddings', {
        query_embedding: embedding,
        match_threshold: 0.5, // Lower threshold to get more results
        match_count: 5,
        filter_organization_id: organizationId // Add organization filter
      });

      if (error) {
        console.error('Error searching for similar content:', error);
        return [];
      }

      if (!results || results.length === 0) {
        console.log('No matching content found');
        return [];
      }

      console.log(`Found ${results.length} matching results`);
      results.forEach((result, index) => {
        console.log(`Result ${index + 1}:
          Title: ${result.metadata?.title}
          Similarity: ${result.similarity}
          Content Preview: ${result.content_chunk.substring(0, 100)}...
        `);
      });

      return results.map(result => ({
        content: result.content_chunk,
        metadata: {
          title: result.metadata?.title || '',
          article_id: result.article_id,
          organization_id: organizationId
        },
        similarity: result.similarity
      }));
    } catch (error) {
      console.error('Error in searchSimilarContent:', error);
      return [];
    }
  }

  async addDocument(content: string, metadata: Record<string, any>) {
    try {
      console.log(`Adding document: "${metadata.title}" for organization: ${metadata.organization_id}`);
      
      // Generate embedding for the content
      const embedding = await this.embeddings.embedQuery(content);

      // Insert the embedding
      const { error } = await this.supabase
        .from('kb_embeddings')
        .insert({
          article_id: metadata.article_id,
          organization_id: metadata.organization_id,
          chunk_index: metadata.chunk_index || 0,
          content: content,
          embedding: embedding,
          metadata: {
            title: metadata.title,
            ...metadata
          }
        });

      if (error) {
        console.error('Error adding document:', error);
        throw error;
      }

      console.log('Document added successfully');
    } catch (error) {
      console.error('Error adding document:', error);
      throw new Error('Failed to add document to knowledge base');
    }
  }

  async deleteDocumentEmbeddings(articleId: string) {
    try {
      const { error } = await this.supabase
        .from('kb_embeddings')
        .delete()
        .eq('article_id', articleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting document embeddings:', error);
      throw new Error('Failed to delete document embeddings');
    }
  }
} 