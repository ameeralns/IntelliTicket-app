import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '@/lib/embeddings';
import { Database } from '@/lib/types/database.types';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function updateEmbeddings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  const embeddingService = new EmbeddingService();

  try {
    // Get all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('*')
      .eq('is_published', true);

    if (articlesError) throw articlesError;

    console.log(`Found ${articles?.length || 0} published articles`);

    // For each article, check if it has embeddings
    for (const article of (articles || [])) {
      const { data: embeddings } = await supabase
        .from('knowledge_embeddings')
        .select('embedding_id')
        .eq('article_id', article.article_id)
        .limit(1);

      if (!embeddings?.length) {
        console.log(`Generating embeddings for article: ${article.title}`);
        
        try {
          await embeddingService.addDocument(
            article.article_id,
            `${article.title}\n\n${article.content}`,
            {
              title: article.title,
              category: article.category,
              is_published: article.is_published
            }
          );
          console.log(`✅ Generated embeddings for: ${article.title}`);
        } catch (error) {
          console.error(`❌ Error generating embeddings for: ${article.title}`, error);
        }
      } else {
        console.log(`Embeddings already exist for: ${article.title}`);
      }
    }

    console.log('Finished updating embeddings');
  } catch (error) {
    console.error('Error updating embeddings:', error);
    process.exit(1);
  }
}

// Run the script
updateEmbeddings(); 