'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  onCategoriesUpdated
}: ManageCategoriesModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      // Get the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('Not authenticated');

      // Get the user's organization_id from agents table
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();

      if (agentError) throw agentError;
      if (!agentData?.organization_id) throw new Error('Organization not found');

      // Get all articles for the organization
      const { data: articles, error: articlesError } = await supabase
        .from('knowledge_articles')
        .select('category')
        .eq('organization_id', agentData.organization_id)
        .not('category', 'is', null)
        .not('category', 'eq', '');

      if (articlesError) throw articlesError;

      // Extract unique categories and sort them
      const uniqueCategories = Array.from(
        new Set(articles.map(a => a.category))
      ).sort();

      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('Not authenticated');

      // Get the user's organization_id
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();

      if (agentError) throw agentError;
      if (!agentData?.organization_id) throw new Error('Organization not found');

      // Check if category already exists
      const categoryExists = categories.includes(newCategory.trim());
      if (categoryExists) {
        throw new Error('This category already exists');
      }

      // Create a placeholder article with the new category
      const { error: insertError } = await supabase
        .from('knowledge_articles')
        .insert({
          title: 'Category Placeholder',
          content: 'This is a placeholder article for the new category.',
          category: newCategory.trim(),
          organization_id: agentData.organization_id,
          is_published: false
        });

      if (insertError) throw insertError;

      setNewCategory('');
      await loadCategories();
      onCategoriesUpdated();
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCategory = async (categoryToRemove: string) => {
    if (!confirm(`Are you sure you want to remove the category "${categoryToRemove}"? This will remove the category from all articles using it.`)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('Not authenticated');

      // Get the user's organization_id
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();

      if (agentError) throw agentError;
      if (!agentData?.organization_id) throw new Error('Organization not found');

      // Update all articles with this category to have no category
      const { error: updateError } = await supabase
        .from('knowledge_articles')
        .update({ category: '' })
        .eq('organization_id', agentData.organization_id)
        .eq('category', categoryToRemove);

      if (updateError) throw updateError;

      await loadCategories();
      onCategoriesUpdated();
    } catch (err) {
      console.error('Error removing category:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove category');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500/75">
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative bg-white w-full max-w-md mx-auto rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 text-sm font-medium text-red-700 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mb-6">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newCategory.trim()}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isSubmitting || !newCategory.trim() ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No categories yet. Add your first category above.
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm font-medium text-gray-900">{category}</span>
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      disabled={isSubmitting}
                      className="text-gray-400 hover:text-red-600 focus:outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 