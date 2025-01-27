import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import { KnowledgeEmbeddingService } from '@/lib/services/KnowledgeEmbeddingService';
import { Database } from '@/lib/types/database.types';
import { Document } from '@langchain/core/documents';

interface KnowledgeAssistantProps {
  organizationId: string;
  user: User | null;
}

export function KnowledgeAssistant({ organizationId, user }: KnowledgeAssistantProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const embeddingService = new KnowledgeEmbeddingService(organizationId);
      const searchResults = await embeddingService.searchSimilarContent(query);
      setResults(searchResults);
    } catch (err) {
      console.error('Error searching knowledge base:', err);
      setError('Failed to search knowledge base. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about our knowledge base..."
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Relevant Articles</h2>
          {results.map((doc, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-lg mb-2">
                {doc.metadata.title || 'Untitled'}
              </h3>
              <p className="text-gray-600">{doc.pageContent}</p>
              {doc.metadata.category && (
                <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-sm rounded">
                  {doc.metadata.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && query && results.length === 0 && (
        <div className="text-center text-gray-500">
          No relevant articles found. Try rephrasing your question.
        </div>
      )}
    </div>
  );
} 