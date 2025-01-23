'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Tag, Loader2 } from 'lucide-react';

interface Tag {
  tag_id: string;
  name: string;
}

interface NewTicketFormProps {
  customerId: string;
  availableTags: Tag[];
}

export default function NewTicketForm({ customerId, availableTags }: NewTicketFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;

    try {
      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          customer_id: customerId,
          title,
          description,
          priority,
          status: 'New'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add tags if selected
      if (selectedTags.length > 0) {
        const tagMappings = selectedTags.map(tagId => ({
          ticket_id: ticket.ticket_id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('ticket_tags')
          .insert(tagMappings);

        if (tagError) throw tagError;
      }

      // Create initial interaction
      const { error: interactionError } = await supabase
        .from('interactions')
        .insert({
          ticket_id: ticket.ticket_id,
          customer_id: customerId,
          content: description,
          interaction_type: 'Note',
          is_private: false
        });

      if (interactionError) throw interactionError;

      router.push(`/dashboard/customer/tickets/${ticket.ticket_id}`);
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to create ticket. Please try again.');
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