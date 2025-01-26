import { useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TicketFeedbackProps {
  ticketId: string;
}

export default function TicketFeedback({ ticketId }: TicketFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setSubmitted(true);
      router.refresh();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Thank You!</h3>
        <p className="text-gray-300">Your feedback has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Rate Your Experience</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="focus:outline-none"
            >
              <Star
                className={`w-8 h-8 ${
                  value <= rating
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-400'
                }`}
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