import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ArticleContent from '@/components/dashboard/customer/knowledge/ArticleContent';
import RelatedArticles from '@/components/dashboard/customer/knowledge/RelatedArticles';
import ArticleFeedback from '@/components/dashboard/customer/knowledge/ArticleFeedback';

interface Props {
  params: {
    articleId: string;
  };
}

export default async function ArticlePage({ params }: Props) {
  const supabase = createServerClient();

  // Get the article
  const { data: article } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('article_id', params.articleId)
    .single();

  if (!article) {
    notFound();
  }

  // Get related articles from the same category
  const { data: relatedArticles } = await supabase
    .from('knowledge_articles')
    .select('article_id, title, read_time')
    .eq('category', article.category)
    .neq('article_id', article.article_id)
    .limit(3);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
          <a href="/dashboard/customer/knowledge" className="hover:text-white">
            Knowledge Base
          </a>
          <span>/</span>
          <span className="text-white">{article.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <ArticleContent article={article} />
            <div className="mt-8 border-t border-gray-700 pt-8">
              <ArticleFeedback articleId={article.article_id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <RelatedArticles articles={relatedArticles || []} />
          </div>
        </div>
      </div>
    </div>
  );
} 