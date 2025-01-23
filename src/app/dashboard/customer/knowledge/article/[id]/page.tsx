import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/types/database.types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const supabase = createServerClient();

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Get customer data to get organization_id
  const { data: customerData } = await supabase
    .from('customers')
    .select('organization_id')
    .eq('email', session.user.email)
    .single();

  if (!customerData) {
    redirect('/auth/signin');
  }

  // Get article data
  const { data: article } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('article_id', params.id)
    .eq('organization_id', customerData.organization_id)
    .eq('is_published', true)
    .single();

  if (!article) {
    redirect('/dashboard/customer/knowledge');
  }

  // Increment view count
  await supabase
    .from('knowledge_articles')
    .update({ view_count: (article.view_count || 0) + 1 })
    .eq('article_id', article.article_id);

  // Calculate read time
  const wordsPerMinute = 200;
  const words = article.content.split(/\s+/).length;
  const readTime = Math.ceil(words / wordsPerMinute);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard/customer/knowledge"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Knowledge Base
        </Link>

        {/* Article Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">{article.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>{readTime} min read</span>
            <span>•</span>
            <span>{article.view_count} views</span>
            <span>•</span>
            <span className="bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-full text-xs font-medium">
              {article.category}
            </span>
          </div>
        </div>

        {/* Article Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          <div className="prose prose-invert max-w-none">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4 text-gray-300">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Related Tags</h2>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 