'use client';

import { X, FileText, ExternalLink } from 'lucide-react';
import { Database } from '@/lib/types/database.types';

type Article = Database['public']['Tables']['knowledge_articles']['Row'];

interface PreviewArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Article;
}

export default function PreviewArticleModal({
  isOpen,
  onClose,
  article
}: PreviewArticleModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Preview Article
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mt-4 space-y-4">
            {/* Article Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {article.title}
              </h1>
              {article.category && (
                <span className="mt-2 inline-block px-2 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-full">
                  {article.category}
                </span>
              )}
            </div>

            {/* Article Content */}
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">
                {article.content}
              </div>
            </div>

            {/* PDF Attachment */}
            {article.pdf_url && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Attachment</h4>
                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{article.pdf_filename || 'Document'}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(article.pdf_size_bytes)}</p>
                    </div>
                  </div>
                  <a
                    href={article.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View PDF</span>
                  </a>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 mt-6 border-t border-gray-100">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        article.is_published
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {article.is_published ? 'Published' : 'Draft'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Views</dt>
                  <dd className="mt-1 text-sm text-gray-900">{article.view_count || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(article.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(article.updated_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 