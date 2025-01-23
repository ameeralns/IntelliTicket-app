'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

interface SatisfactionRatingProps {
  ticketId: string;
  currentRating: number | null;
  isResolved: boolean;
}

export default function SatisfactionRating({ 
  ticketId, 
  currentRating,
  isResolved 
}: SatisfactionRatingProps) {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();

  const handleRatingSubmit = async (selectedRating: number) => {
    if (!isResolved) {
      toast.error('Can only rate resolved tickets');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ satisfaction_score: selectedRating })
        .eq('ticket_id', ticketId);

      if (error) throw error;

      setRating(selectedRating);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isResolved) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Rate Your Experience</h2>
      <p className="text-gray-400 text-sm mb-4">
        How satisfied were you with the resolution of this ticket?
      </p>
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={isSubmitting}
            onClick={() => handleRatingSubmit(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none disabled:opacity-50"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hoveredRating || rating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-500'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className="text-gray-400 text-sm mt-2">
          You rated this ticket {rating} out of 5 stars
        </p>
      )}
    </div>
  );
} 