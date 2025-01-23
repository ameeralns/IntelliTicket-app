'use client';

import { Book, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface KnowledgeBaseProps {
  customerId: string;
}

// This would typically come from your database
const popularArticles = [
  {
    id: 1,
    title: 'Getting Started Guide',
    category: 'Basics',
    readTime: '5 min',
  },
  {
    id: 2,
    title: 'How to Create a Ticket',
    category: 'Tickets',
    readTime: '3 min',
  },
  {
    id: 3,
    title: 'Understanding Priority Levels',
    category: 'Support',
    readTime: '4 min',
  },
  {
    id: 4,
    title: 'Best Practices for Quick Resolution',
    category: 'Tips',
    readTime: '6 min',
  },
];

export default function KnowledgeBase({ customerId }: KnowledgeBaseProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Knowledge Base</h2>
        <Link
          href="/dashboard/customer/knowledge"
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <div className="space-y-4">
        {popularArticles.map((article) => (
          <Link
            key={article.id}
            href={`/dashboard/customer/knowledge/articles/${article.id}`}
            className="block bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-blue-500/20 text-blue-500 p-2 rounded-lg">
                <Book className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">{article.title}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs text-gray-400">{article.category}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">{article.readTime} read</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Help Section */}
      <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">Need Help?</h3>
        <p className="text-sm text-gray-400 mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <Link
          href="/dashboard/customer/tickets/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
} 