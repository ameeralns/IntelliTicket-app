'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Download, File, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Attachment {
  attachment_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  created_at: string;
}

interface TicketAttachmentsProps {
  ticketId: string;
}

export default function TicketAttachments({ ticketId }: TicketAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchAttachments() {
      try {
        const { data, error } = await supabase
          .from('ticket_attachments')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAttachments(data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
        toast.error('Failed to load attachments');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAttachments();
  }, [ticketId]);

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.attachment_id);
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .download(attachment.storage_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Attachments</h2>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Attachments</h2>
      <div className="space-y-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.attachment_id}
            className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <File className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">{attachment.file_name}</p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(attachment)}
              disabled={downloadingId === attachment.attachment_id}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
            >
              {downloadingId === attachment.attachment_id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 