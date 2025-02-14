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
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(!!currentRating);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResolved) {
      toast.error('Can only rate resolved tickets');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/customer/tickets/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          satisfactionScore: rating,
          comment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setHasSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isResolved) {
    return null;
  }

  if (hasSubmitted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Thank You!</h2>
        <p className="text-gray-300">You rated this ticket {rating} out of 5 stars</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Rate Your Experience</h2>
      <p className="text-gray-400 text-sm mb-4">
        How satisfied were you with the resolution of this ticket?
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={isSubmitting}
              onClick={() => setRating(star)}
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
        
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-2">
            Additional Comments
          </label>
          <textarea
            id="comment"
            rows={4}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Share your thoughts about our service..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={rating === 0 || isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
} 