'use client';

import { useState } from 'react';
import { Plus, FolderEdit, Upload, Download } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import NewArticleModal from './NewArticleModal';
import ManageCategoriesModal from './ManageCategoriesModal';

interface QuickActionsProps {
  onArticleCreated?: () => void;
  onCategoriesUpdated?: () => void;
}

export default function QuickActions({ onArticleCreated, onCategoriesUpdated }: QuickActionsProps) {
  const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const supabase = createClientComponentClient<Database>();

  const loadCategories = async () => {
    try {
      // Get the current user's organization_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('Not authenticated');
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();

      if (!agentData?.organization_id) {
        throw new Error('Could not determine organization');
      }

      // Get unique categories from articles
      const { data: articles } = await supabase
        .from('knowledge_articles')
        .select('category')
        .eq('organization_id', agentData.organization_id);

      if (articles) {
        const uniqueCategories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Failed to load categories. Please try again.');
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const articles = JSON.parse(e.target?.result as string);
            
            // Get the current user's organization_id
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
              throw new Error('Not authenticated');
            }

            const { data: agentData } = await supabase
              .from('agents')
              .select('organization_id')
              .eq('email', session.user.email)
              .single();

            if (!agentData?.organization_id) {
              throw new Error('Could not determine organization');
            }

            // Add organization_id to each article
            const articlesWithOrg = articles.map((article: any) => ({
              ...article,
              organization_id: agentData.organization_id
            }));

            // Insert articles
            const { error } = await supabase
              .from('knowledge_articles')
              .insert(articlesWithOrg);

            if (error) throw error;

            alert('Articles imported successfully!');
            onArticleCreated?.();
          } catch (error) {
            console.error('Error importing articles:', error);
            alert('Failed to import articles. Please check the file format and try again.');
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      console.error('Error importing articles:', error);
      alert('Failed to import articles. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      // Get the current user's organization_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('Not authenticated');
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();

      if (!agentData?.organization_id) {
        throw new Error('Could not determine organization');
      }

      // Get all articles for the organization
      const { data: articles } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('organization_id', agentData.organization_id);

      if (!articles) {
        throw new Error('No articles found');
      }

      // Create and download the JSON file
      const cleanedArticles = articles.map(({ organization_id, article_id, created_at, updated_at, ...rest }) => rest);
      const blob = new Blob([JSON.stringify(cleanedArticles, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge_articles_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting articles:', error);
      alert('Failed to export articles. Please try again.');
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => {
            loadCategories();
            setIsNewArticleModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </button>

        <button
          onClick={() => setIsCategoriesModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
        >
          <FolderEdit className="w-4 h-4 mr-2" />
          Manage Categories
        </button>

        <button
          onClick={handleImport}
          className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Articles
        </button>

        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Articles
        </button>
      </div>

      {/* New Article Modal */}
      <NewArticleModal
        isOpen={isNewArticleModalOpen}
        onClose={() => setIsNewArticleModalOpen(false)}
        categories={categories}
        onArticleCreated={() => {
          onArticleCreated?.();
          setIsNewArticleModalOpen(false);
        }}
      />

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        onCategoriesUpdated={() => {
          onCategoriesUpdated?.();
          setIsCategoriesModalOpen(false);
        }}
      />
    </>
  );
} 