"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ArticleFeedbackProps {
  articleId: string;
}

export default function ArticleFeedback({ articleId }: ArticleFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClientComponentClient();

  const submitFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (submitted) return;
    
    setFeedback(type);
    setSubmitted(true);
    
    await supabase.from('article_feedback').insert({
      article_id: articleId,
      feedback_type: type,
    });
  };

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-gray-400">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-white mb-4">Was this article helpful?</h4>
      <div className="flex space-x-4">
        <button
          onClick={() => submitFeedback('helpful')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            feedback === 'helpful'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          Yes, it helped
        </button>
        <button
          onClick={() => submitFeedback('not_helpful')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            feedback === 'not_helpful'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          No, I need more help
        </button>
      </div>
    </div>
  );
} 