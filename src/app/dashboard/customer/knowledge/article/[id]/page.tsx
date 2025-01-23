import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ArticleContent from '@/components/dashboard/customer/knowledge/ArticleContent';
import { Database } from '@/lib/supabase/database.types';

interface PageProps {
  params: {
    id: string;
  };
}

type Article = Database['public']['Tables']['knowledge_base_articles']['Row'];

export default async function ArticlePage({ params }: PageProps) {
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

  // Get article data
  const { data: article } = await supabase
    .from('knowledge_base_articles')
    .select('*')
    .eq('article_id', params.id)
    .single();

  if (!article) {
    redirect('/dashboard/customer/knowledge');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ArticleContent article={article} />
    </div>
  );
} 