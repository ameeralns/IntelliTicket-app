'use client';

import Link from 'next/link';
import { Clock, FileText } from 'lucide-react';
import { Database } from '@/lib/types/database.types';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface KnowledgeBaseArticleListProps {
  articles: Article[];
}

export default function KnowledgeBaseArticleList({ articles }: KnowledgeBaseArticleListProps) {
  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <Link
          key={article.article_id}
          href={`/dashboard/customer/knowledge/article/${article.article_id}`}
          className="block bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">{article.title}</h3>
              <p className="text-gray-400 line-clamp-2">{article.content}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{Math.ceil(article.content.split(/\s+/).length / 200)} min read</span>
                </div>
                {article.pdf_url && (
                  <div className="flex items-center text-blue-400">
                    <FileText className="w-4 h-4 mr-1" />
                    <span>Has attachment</span>
                  </div>
                )}
                <span className="bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {article.category}
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-400">
              {article.view_count || 0} views
            </div>
          </div>
        </Link>
      ))}

      {articles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No articles found</p>
        </div>
      )}
    </div>
  );
} 