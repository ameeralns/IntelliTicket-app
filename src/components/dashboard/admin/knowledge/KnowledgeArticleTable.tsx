'use client';

import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Eye, Edit2, Trash2, Check, X } from 'lucide-react';
import { Database } from '@/lib/types/database.types';
import KnowledgeSearch from './KnowledgeSearch';
import EditArticleModal from './EditArticleModal';
import PreviewArticleModal from './PreviewArticleModal';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface KnowledgeArticleTableProps {
  initialArticles: Article[];
  onArticleUpdated: () => void;
}

interface SearchFilters {
  category: string;
  status: 'all' | 'published' | 'draft';
}

export default function KnowledgeArticleTable({ 
  initialArticles,
  onArticleUpdated
}: KnowledgeArticleTableProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>(initialArticles);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Article>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [previewingArticle, setPreviewingArticle] = useState<Article | null>(null);
  const supabase = createClientComponentClient<Database>();

  // Extract unique categories
  const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));

  const handleSearch = useCallback((query: string, filters: SearchFilters) => {
    let filtered = [...articles];

    // Apply text search
    if (query) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(article => article.category === filters.category);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(article => 
        filters.status === 'published' ? article.is_published : !article.is_published
      );
    }

    // Apply current sort
    const sortedArticles = [...filtered].sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';
      const modifier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'boolean') {
        return ((aValue === bValue) ? 0 : aValue ? -1 : 1) * modifier;
      }

      if (typeof aValue === 'number') {
        return (aValue - (bValue as number)) * modifier;
      }

      // Handle dates
      if (sortField === 'created_at' || sortField === 'updated_at') {
        return (new Date(aValue as string).getTime() - new Date(bValue as string).getTime()) * modifier;
      }

      // Default string comparison
      return String(aValue).localeCompare(String(bValue)) * modifier;
    });

    setDisplayedArticles(sortedArticles);
  }, [articles, sortField, sortDirection]);

  const handleSort = (field: keyof Article) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }

    const sortedArticles = [...displayedArticles].sort((a, b) => {
      const aValue = a[field] ?? '';
      const bValue = b[field] ?? '';
      const modifier = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'boolean') {
        return ((aValue === bValue) ? 0 : aValue ? -1 : 1) * modifier;
      }

      if (typeof aValue === 'number') {
        return (aValue - (bValue as number)) * modifier;
      }

      // Handle dates
      if (field === 'created_at' || field === 'updated_at') {
        return (new Date(aValue as string).getTime() - new Date(bValue as string).getTime()) * modifier;
      }

      // Default string comparison
      return String(aValue).localeCompare(String(bValue)) * modifier;
    });

    setDisplayedArticles(sortedArticles);
  };

  const togglePublish = async (article: Article) => {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .update({ is_published: !article.is_published })
      .eq('article_id', article.article_id)
      .select()
      .single();

    if (!error && data) {
      const updatedArticles = articles.map(a => 
        a.article_id === article.article_id ? data : a
      );
      setArticles(updatedArticles);
      setDisplayedArticles(prevDisplayed => 
        prevDisplayed.map(a => a.article_id === article.article_id ? data : a)
      );
      onArticleUpdated();
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('article_id', articleId);

    if (!error) {
      const updatedArticles = articles.filter(a => a.article_id !== articleId);
      setArticles(updatedArticles);
      setDisplayedArticles(prevDisplayed => 
        prevDisplayed.filter(a => a.article_id !== articleId)
      );
      onArticleUpdated();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div>
      <KnowledgeSearch onSearch={handleSearch} categories={categories} />
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedArticles(new Set(displayedArticles.map(a => a.article_id)));
                      } else {
                        setSelectedArticles(new Set());
                      }
                    }}
                    checked={selectedArticles.size === displayedArticles.length}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('title')}
                >
                  Title
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('category')}
                >
                  Category
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('view_count')}
                >
                  Views
                </th>
                <th 
                  className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('updated_at')}
                >
                  Last Updated
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedArticles.map((article) => (
                <tr key={article.article_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedArticles.has(article.article_id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedArticles);
                        if (e.target.checked) {
                          newSelected.add(article.article_id);
                        } else {
                          newSelected.delete(article.article_id);
                        }
                        setSelectedArticles(newSelected);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{article.title}</td>
                  <td className="px-6 py-4 text-gray-600">{article.category}</td>
                  <td className="px-6 py-4 text-gray-600">{article.view_count || 0}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(article.updated_at)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        article.is_published
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {article.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => togglePublish(article)}
                        className="text-gray-400 hover:text-gray-600"
                        title={article.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {article.is_published ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingArticle(article)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPreviewingArticle(article)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteArticle(article.article_id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingArticle && (
        <EditArticleModal
          isOpen={!!editingArticle}
          onClose={() => setEditingArticle(null)}
          article={editingArticle}
          categories={categories}
          onArticleUpdated={() => {
            onArticleUpdated();
            setEditingArticle(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewingArticle && (
        <PreviewArticleModal
          isOpen={!!previewingArticle}
          onClose={() => setPreviewingArticle(null)}
          article={previewingArticle}
        />
      )}
    </div>
  );
} 