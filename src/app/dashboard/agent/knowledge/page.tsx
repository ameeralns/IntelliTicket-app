import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/database.types';
import KnowledgeClient from './knowledge-client';

export const metadata: Metadata = {
  title: 'Knowledge Base | IntelliTicket',
  description: 'Manage and organize your team\'s knowledge articles',
};

export default async function KnowledgePage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user.email) {
    redirect('/auth');
  }

  // Get the agent's organization_id
  const { data: agentData, error: agentError } = await supabase
    .from('agents')
    .select('organization_id')
    .eq('email', session.user.email)
    .single();

  if (agentError || !agentData) {
    console.error('Error fetching agent:', agentError);
    redirect('/auth');
  }

  // First fetch all articles
  const { data: articles, error: articlesError } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('organization_id', agentData.organization_id);

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
    return <div>Error loading articles</div>;
  }

  // Get unique categories from articles
  const categories = Array.from(new Set(articles.map(article => article.category))).filter(Boolean);

  return (
    <KnowledgeClient
      articles={articles}
      categories={categories}
      organizationId={agentData.organization_id}
    />
  );
} 