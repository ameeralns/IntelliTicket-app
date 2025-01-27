#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { Database } from '../lib/types/database.types';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verify environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAIKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}
if (!openAIKey) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Initialize Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openAIKey
});

// Text splitter configuration
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});

async function generateEmbeddings() {
  try {
    // Get all published articles that don't have embeddings
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('article_id, title, content, organization_id')
      .eq('is_published', true);

    if (articlesError) {
      throw articlesError;
    }

    console.log(`Found ${articles.length} articles to process`);

    for (const article of articles) {
      // Check if embeddings already exist
      const { data: existingEmbeddings } = await supabase
        .from('kb_embeddings')
        .select('embedding_id')
        .eq('article_id', article.article_id);

      if (existingEmbeddings && existingEmbeddings.length > 0) {
        console.log(`Skipping article ${article.article_id} - embeddings already exist`);
        continue;
      }

      // Split content into chunks
      const docs = await textSplitter.createDocuments([article.content]);

      console.log(`Processing article ${article.article_id} - ${docs.length} chunks`);

      // Generate embeddings for each chunk
      for (let i = 0; i < docs.length; i++) {
        const chunk = docs[i];
        const embedding = await embeddings.embedQuery(chunk.pageContent);

        // Store embedding in database
        const { error: insertError } = await supabase
          .from('kb_embeddings')
          .insert({
            article_id: article.article_id,
            organization_id: article.organization_id,
            chunk_index: i,
            content: chunk.pageContent,
            embedding: embedding,
            metadata: {
              title: article.title,
              chunk_index: i,
              total_chunks: docs.length
            }
          });

        if (insertError) {
          console.error(`Error inserting embedding for article ${article.article_id}:`, insertError);
          continue;
        }
      }

      console.log(`Completed article ${article.article_id}`);
    }

    console.log('Embedding generation complete');
  } catch (error) {
    console.error('Error generating embeddings:', error);
    process.exit(1);
  }
}

// Run the script
generateEmbeddings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 