import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KnowledgeBaseSearch from '@/components/dashboard/customer/knowledge/KnowledgeBaseSearch';
import KnowledgeBaseCategories from '@/components/dashboard/customer/knowledge/KnowledgeBaseCategories';
import KnowledgeBaseArticleList from '@/components/dashboard/customer/knowledge/KnowledgeBaseArticleList';
import { Database } from '@/lib/supabase/database.types';

type Article = Database['public']['Tables']['knowledge_base_articles']['Row'];

export default async function KnowledgeBasePage() {
  const supabase = createServerClient();

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (!customerData) {
    redirect('/auth/signin');
  }

  // Get articles
  const { data: articles = [] } = await supabase
    .from('knowledge_base_articles')
    .select('*')
    .order('created_at', { ascending: false }) as { data: Article[] | null };

  // Calculate categories with article counts
  const categories = Array.from(
    (articles || []).reduce((acc, article) => {
      const count = acc.get(article.category) || 0;
      acc.set(article.category, count + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-gray-400">
            Find answers to common questions and learn more about our services.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <KnowledgeBaseSearch />
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="md:col-span-1">
            <KnowledgeBaseCategories categories={categories} />
          </div>

          {/* Articles List */}
          <div className="md:col-span-3">
            <KnowledgeBaseArticleList articles={articles || []} />
          </div>
        </div>
      </div>
    </div>
  );
} 