'use client';

import { AlertTriangle } from 'lucide-react';

export default function ErrorKnowledgePage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
          <p className="text-gray-600 mb-6">
            {error.message || 'An error occurred while loading the knowledge base.'}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
} 