import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '@/lib/embeddings';
import { Database } from '@/lib/types/database.types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BATCH_SIZE = 10;
const POLLING_INTERVAL = 30000; // 30 seconds

async function processEmbeddingJobs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  const embeddingService = new EmbeddingService();

  try {
    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('embedding_jobs')
      .select('job_id, article_id')
      .eq('status', 'pending')
      .limit(BATCH_SIZE);

    if (jobsError) throw jobsError;
    if (!jobs?.length) return;

    console.log(`Processing ${jobs.length} embedding jobs`);

    for (const job of jobs) {
      try {
        // Mark job as processing
        await supabase
          .from('embedding_jobs')
          .update({ status: 'processing' })
          .eq('job_id', job.job_id);

        // Get article data
        const { data: article, error: articleError } = await supabase
          .from('knowledge_articles')
          .select('*')
          .eq('article_id', job.article_id)
          .single();

        if (articleError) throw articleError;

        // Generate embeddings
        await embeddingService.addDocument(
          article.article_id,
          `${article.title}\n\n${article.content}`,
          {
            title: article.title,
            category: article.category,
            is_published: article.is_published
          }
        );

        // Mark job as completed
        await supabase
          .from('embedding_jobs')
          .update({ status: 'completed' })
          .eq('job_id', job.job_id);

        console.log(`✅ Generated embeddings for article: ${article.title}`);
      } catch (error) {
        console.error(`❌ Error processing job ${job.job_id}:`, error);
        
        // Mark job as failed
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('job_id', job.job_id);
      }
    }
  } catch (error) {
    console.error('Error in embedding worker:', error);
  }
}

// Run the worker continuously
async function startWorker() {
  while (true) {
    await processEmbeddingJobs();
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
  }
}

// Start the worker if this is the main module
if (import.meta.url === import.meta.resolve('./embedding-worker.ts')) {
  startWorker().catch(console.error);
} 