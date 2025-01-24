'use client';

import { FileText, ExternalLink } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ArticleAttachmentProps {
  pdfUrl: string | null;
  pdfFilename: string | null;
  pdfSizeBytes: number | null;
}

export default function ArticleAttachment({ pdfUrl, pdfFilename, pdfSizeBytes }: ArticleAttachmentProps) {
  if (!pdfUrl || !pdfFilename) return null;

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
    <div className="mt-8 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Attachments</h3>
      <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <FileText className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-white font-medium">{pdfFilename}</p>
            <p className="text-sm text-gray-400">{formatFileSize(pdfSizeBytes)}</p>
          </div>
        </div>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View PDF</span>
        </a>
      </div>
    </div>
  );
} 