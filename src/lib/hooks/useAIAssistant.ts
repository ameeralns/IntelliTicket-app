import { useState } from 'react';

interface AIRequest {
  query: string;
  organizationId: string;
}

interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  traceId?: string;
}

export function useAIAssistant() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processQuery = async ({ query, organizationId }: AIRequest): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const res = await fetch('/api/ai/admin/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, organizationId }),
      });

      const data: AIResponse = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process query');
      }

      setResponse(data.response || null);
    } catch (err) {
      console.error('Error processing AI query:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processQuery,
    isProcessing,
    response,
    error
  };
} 