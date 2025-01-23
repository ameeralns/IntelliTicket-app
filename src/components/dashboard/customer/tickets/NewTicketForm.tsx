'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Tag, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface NewTicketFormProps {
  customerId: string;
  availableTags: {
    tag_id: string;
    name: string;
  }[];
}

interface FileUpload {
  file: File;
  progress: number;
}

export default function NewTicketForm({ customerId, availableTags }: NewTicketFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to array and add progress property
    const newFiles = Array.from(files).map(file => ({
      file,
      progress: 0
    }));

    setFileUploads(prev => [...prev, ...newFiles]);
  };

  const uploadFile = async (fileUpload: FileUpload) => {
    const { file } = fileUpload;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    try {
      console.log('Starting file upload:', fileName);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      const { data: session } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id);

      const { error: uploadError, data } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error details:', {
          statusCode: uploadError.statusCode,
          message: uploadError.message,
          error: uploadError.error
        });
        throw uploadError;
      }

      console.log('Upload successful:', data);

      return {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: fileName
      };
    } catch (error) {
      console.error('Error uploading file - Full error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      console.log('Starting ticket creation...');
      
      // Create the ticket first
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          customer_id: customerId,
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          priority: formData.get('priority') as string,
          status: 'New'
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Ticket creation error:', ticketError);
        throw ticketError;
      }

      console.log('Ticket created successfully:', ticket);

      // Upload files and create attachment records
      if (fileUploads.length > 0) {
        console.log('Starting file uploads for ticket:', ticket.ticket_id);
        
        for (const fileUpload of fileUploads) {
          try {
            const attachmentData = await uploadFile(fileUpload);
            console.log('File uploaded, creating attachment record:', attachmentData);
            
            const { error: attachmentError } = await supabase
              .from('ticket_attachments')
              .insert({
                ticket_id: ticket.ticket_id,
                ...attachmentData,
                uploaded_by: customerId
              });

            if (attachmentError) {
              console.error('Attachment record error:', attachmentError);
              throw attachmentError;
            }
          } catch (error) {
            console.error('File upload/attachment error:', error);
            throw error;
          }
        }
      }

      // Add tags if selected
      if (selectedTags.length > 0) {
        console.log('Adding tags to ticket:', selectedTags);
        
        const tagPromises = selectedTags.map((tagId) =>
          supabase
            .from('ticket_tags')
            .insert({
              ticket_id: ticket.ticket_id,
              tag_id: tagId
            })
        );

        await Promise.all(tagPromises);
      }

      toast.success('Ticket created successfully');
      router.push(`/dashboard/customer/tickets/${ticket.ticket_id}`);
    } catch (error) {
      console.error('Error in ticket creation process:', error);
      setError('Failed to create ticket. Please try again.');
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of the issue"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          placeholder="Detailed description of your issue..."
        />
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
          Priority
        </label>
        <select
          id="priority"
          name="priority"
          required
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Attachments
        </label>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Any file up to 10MB
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </label>
          </div>

          {/* File List */}
          {fileUploads.length > 0 && (
            <div className="space-y-2">
              {fileUploads.map((fileUpload, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-700 p-2 rounded-lg"
                >
                  <span className="text-sm text-gray-300 truncate">
                    {fileUpload.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFileUploads(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.tag_id}
              type="button"
              onClick={() => setSelectedTags(prev =>
                prev.includes(tag.tag_id)
                  ? prev.filter(id => id !== tag.tag_id)
                  : [...prev, tag.tag_id]
              )}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag.tag_id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Tag className="w-4 h-4 mr-1" />
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
              Creating...
            </>
          ) : (
            'Create Ticket'
          )}
        </button>
      </div>
    </form>
  );
} 