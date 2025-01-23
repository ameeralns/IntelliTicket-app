'use client';

import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';
import { Database } from '@/lib/types/database.types';
import { useSearchParams } from 'next/navigation';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface KnowledgeBaseArticleListProps {
  articles: Article[];
}

export default function KnowledgeBaseArticleList({ articles }: KnowledgeBaseArticleListProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase();
  const category = searchParams.get('category');

  // Filter articles based on search query and category
  const filteredArticles = articles.filter((article) => {
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery) ||
      article.content.toLowerCase().includes(searchQuery);
    
    const matchesCategory = !category || article.category === category;

    return matchesSearch && matchesCategory;
  });

  if (filteredArticles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          {searchQuery
            ? `No articles found matching "${searchQuery}"`
            : category
            ? `No articles found in category "${category}"`
            : 'No articles found'}
        </p>
      </div>
    );
  }

  // Calculate estimated read time based on content length (rough estimate)
  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  return (
    <div className="space-y-4">
      {filteredArticles.map((article) => (
        <Link
          key={article.article_id}
          href={`/dashboard/customer/knowledge/article/${article.article_id}`}
          className="block bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                {article.title}
              </h3>
              <p className="text-gray-400 line-clamp-2">
                {article.content}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span className="inline-flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{calculateReadTime(article.content)} min read</span>
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                  {article.category}
                </span>
                {article.view_count > 0 && (
                  <span className="text-gray-500">
                    {article.view_count} views
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>
      ))}
    </div>
  );
} 