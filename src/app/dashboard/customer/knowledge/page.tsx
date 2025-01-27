import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KnowledgeBaseSearch from '@/components/dashboard/customer/knowledge/KnowledgeBaseSearch';
import KnowledgeBaseCategories from '@/components/dashboard/customer/knowledge/KnowledgeBaseCategories';
import KnowledgeBaseArticleList from '@/components/dashboard/customer/knowledge/KnowledgeBaseArticleList';
import KnowledgeAssistantChat from '@/components/dashboard/customer/knowledge/KnowledgeAssistantChat';
import { Database } from '@/lib/types/database.types';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

export default async function KnowledgeBasePage() {
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

  // Get published articles for the customer's organization
  const { data: articles = [] } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('organization_id', customerData.organization_id)
    .eq('is_published', true)
    .order('created_at', { ascending: false }) as { data: Article[] };

  // Calculate categories with article counts
  const categories = Array.from(
    articles.reduce((acc, article) => {
      if (article.category) { // Only process if category is not null
        const count = acc.get(article.category) || 0;
        acc.set(article.category, count + 1);
      }
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-2">
            <KnowledgeBaseCategories categories={categories} />
          </div>

          {/* Articles List */}
          <div className="lg:col-span-6">
            <KnowledgeBaseArticleList articles={articles} />
          </div>

          {/* AI Assistant Chat */}
          <div className="lg:col-span-4">
            <div className="sticky top-4">
              <div className="rounded-xl shadow-2xl bg-gradient-to-b from-blue-900/20 to-blue-950/20 backdrop-blur-sm border border-blue-500/20">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-blue-400">AI Assistant</h2>
                  <KnowledgeAssistantChat organizationId={customerData.organization_id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 