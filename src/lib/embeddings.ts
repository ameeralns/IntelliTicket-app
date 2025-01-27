import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Database } from './types/database.types';

export class EmbeddingService {
  private supabase;
  private openai;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.replace(/\n/g, ' '),
    });

    return response.data[0].embedding;
  }

  private async splitIntoChunks(text: string, maxChunkSize: number = 1000): Promise<string[]> {
    const sentences = text.split(/[.!?]+/g);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  async addDocument(articleId: string, content: string, metadata: Record<string, any> = {}) {
    const chunks = await this.splitIntoChunks(content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);

      await this.supabase.from('knowledge_embeddings').insert({
        article_id: articleId,
        content_chunk: chunk,
        embedding,
        chunk_index: i,
        metadata
      });
    }
  }

  async findSimilarContent(query: string, threshold: number = 0.7, limit: number = 5) {
    const embedding = await this.generateEmbedding(query);

    const { data: similarChunks, error } = await this.supabase.rpc(
      'match_knowledge_embeddings',
      {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit
      }
    );

    if (error) throw error;
    return similarChunks;
  }

  async deleteDocumentEmbeddings(articleId: string) {
    await this.supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('article_id', articleId);
  }
} 