'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface NewTicketFormProps {
  customerId: string;
  availableTags: {
    tag_id: string;
    name: string;
  }[];
}

export default function NewTicketForm({ customerId, availableTags }: NewTicketFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      // Create the ticket
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

      if (ticketError) throw ticketError;

      // Add tags if selected
      if (selectedTags.length > 0) {
        const tagData = selectedTags.map(tagId => ({
          ticket_id: ticket.ticket_id,
          tag_id: tagId
        }));

        const { error: tagsError } = await supabase
          .from('ticket_tags')
          .insert(tagData);

        if (tagsError) {
          console.error('Error adding tags:', tagsError);
          toast.error('Ticket created but failed to add some tags');
        }
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
    <div className="space-y-6">
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
            maxLength={255}
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
            defaultValue=""
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select priority level</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tags (Optional)
          </label>
          {availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.tag_id}
                  type="button"
                  onClick={() => handleTagToggle(tag.tag_id)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag.tag_id)
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Tag className="w-4 h-4 mr-1.5" />
                  {tag.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No tags available</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
} 