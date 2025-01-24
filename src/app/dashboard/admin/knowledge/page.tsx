'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import { Database } from '@/lib/types/database.types';
import KnowledgeArticleTable from '@/components/dashboard/admin/knowledge/KnowledgeArticleTable';
import QuickActions from '@/components/dashboard/admin/knowledge/QuickActions';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

export default function AdminKnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get session and verify admin access
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        redirect('/auth/signin');
      }

      // Get agent data to verify admin role and get organization_id
      const { data: agentData } = await supabase
        .from('agents')
        .select('organization_id, role')
        .eq('email', session.user.email)
        .single();

      if (!agentData || agentData.role !== 'admin') {
        redirect('/dashboard');
      }

      // Get all articles for the organization
      const { data: articlesData } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('organization_id', agentData.organization_id)
        .order('created_at', { ascending: false });

      setArticles(articlesData || []);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set((articlesData || []).map(a => a.category).filter(Boolean)));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate statistics
  const totalArticles = articles.length;
  const publishedArticles = articles.filter(a => a.is_published).length;
  const draftArticles = totalArticles - publishedArticles;
  const totalViews = articles.reduce((sum, article) => sum + (article.view_count || 0), 0);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base Management</h1>
          <p className="text-gray-500">
            Manage and organize your knowledge base articles
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions
          onArticleCreated={loadData}
          onCategoriesUpdated={loadData}
        />

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Articles</h3>
            <p className="text-3xl font-bold text-gray-900">{totalArticles}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Published</h3>
            <p className="text-3xl font-bold text-green-600">{publishedArticles}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Drafts</h3>
            <p className="text-3xl font-bold text-yellow-600">{draftArticles}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Views</h3>
            <p className="text-3xl font-bold text-blue-600">{totalViews}</p>
          </div>
        </div>

        {/* Articles Table */}
        <div className="mb-8">
          <KnowledgeArticleTable
            initialArticles={articles}
            onArticleUpdated={loadData}
          />
        </div>
      </div>
    </div>
  );
} 