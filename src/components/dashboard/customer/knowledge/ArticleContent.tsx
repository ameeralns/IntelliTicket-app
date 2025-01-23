'use client';

import { Clock, Calendar } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { ReactNode } from 'react';
import { Database } from '@/lib/supabase/database.types';

type Article = Database['public']['Tables']['knowledge_base_articles']['Row'];

interface ArticleContentProps {
  article: Article;
}

interface ComponentProps {
  children: ReactNode;
}

export default function ArticleContent({ article }: ArticleContentProps) {
  const components: Partial<Components> = {
    h1: ({ children }: ComponentProps) => (
      <h1 className="text-2xl font-bold mb-4">{children}</h1>
    ),
    h2: ({ children }: ComponentProps) => (
      <h2 className="text-xl font-bold mb-3">{children}</h2>
    ),
    h3: ({ children }: ComponentProps) => (
      <h3 className="text-lg font-bold mb-2">{children}</h3>
    ),
    p: ({ children }: ComponentProps) => (
      <p className="mb-4 text-gray-300">{children}</p>
    ),
    ul: ({ children }: ComponentProps) => (
      <ul className="list-disc pl-6 mb-4 text-gray-300">{children}</ul>
    ),
    ol: ({ children }: ComponentProps) => (
      <ol className="list-decimal pl-6 mb-4 text-gray-300">{children}</ol>
    ),
    code: ({ children }: ComponentProps) => (
      <code className="bg-gray-800 px-2 py-1 rounded">{children}</code>
    ),
    pre: ({ children }: ComponentProps) => (
      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    ),
  };

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-4">{article.title}</h1>
      
      {/* Article Meta */}
      <div className="flex items-center space-x-6 text-sm text-gray-400 mb-8">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          <span>{article.read_time} min read</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            Last updated {new Date(article.updated_at || '').toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Category Badge */}
      <div className="mb-8">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-500">
          {article.category}
        </span>
      </div>

      {/* Article Content */}
      <div className="mt-6">
        <ReactMarkdown components={components}>
          {article.content}
        </ReactMarkdown>
      </div>
    </article>
  );
} 