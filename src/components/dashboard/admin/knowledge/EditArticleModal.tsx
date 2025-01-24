'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface EditArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
  categories: string[];
  onArticleUpdated: () => void;
}

export default function EditArticleModal({
  isOpen,
  onClose,
  article,
  categories,
  onArticleUpdated
}: EditArticleModalProps) {
  const [title, setTitle] = useState(article.title);
  const [content, setContent] = useState(article.content);
  const [category, setCategory] = useState(article.category);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('knowledge_articles')
        .update({
          title,
          content,
          category,
          updated_at: new Date().toISOString(),
        })
        .eq('article_id', article.article_id);

      if (updateError) throw updateError;

      onArticleUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500/75">
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative bg-white w-full max-w-2xl mx-auto rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Article
            </h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 text-sm font-medium text-red-700 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label htmlFor="title" className="block mb-1.5 text-sm font-medium text-gray-900">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Category Select */}
              <div>
                <label htmlFor="category" className="block mb-1.5 text-sm font-medium text-gray-900">
                  Category
                </label>
                <select
                  id="category"
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" className="text-gray-500">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="text-gray-900">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Textarea */}
              <div>
                <label htmlFor="content" className="block mb-1.5 text-sm font-medium text-gray-900">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 