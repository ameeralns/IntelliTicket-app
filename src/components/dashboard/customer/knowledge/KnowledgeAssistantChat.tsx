'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Bot, User, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface KnowledgeAssistantChatProps {
  organizationId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function KnowledgeAssistantChat({ organizationId }: KnowledgeAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          organizationId: organizationId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while getting the response');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-lg border border-blue-500/20 bg-blue-950/10">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-t-lg">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 text-blue-400" />
            <h3 className="font-semibold mb-2 text-blue-400">Knowledge Assistant</h3>
            <p className="text-sm text-blue-300/80">Ask me anything about our services and knowledge base!</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3 w-full",
              message.role === 'assistant' ? 'justify-start' : 'justify-end'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <Bot className="h-8 w-8 text-blue-400" />
              </div>
            )}
            
            <Card className={cn(
              "p-4 max-w-[80%]",
              message.role === 'assistant' 
                ? 'bg-blue-900/20 text-blue-100 border-blue-500/20' 
                : 'bg-blue-600 text-blue-50 border-blue-500/20'
            )}>
              <div className={cn(
                "prose prose-sm max-w-none",
                message.role === 'user' ? 'prose-invert' : 'prose-blue'
              )}>
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </Card>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-400" />
            <Card className="p-4 bg-blue-900/20 border-blue-500/20">
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            </Card>
          </div>
        )}

        {error && (
          <Card className="p-4 bg-red-900/20 text-red-400 border-red-500/20">
            {error}
          </Card>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-blue-500/20 bg-blue-950/40">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about our knowledge base..."
            className="min-h-[60px] max-h-[120px] resize-none bg-blue-900/20 border-blue-500/20 text-blue-100 placeholder:text-blue-300/50 focus:border-blue-400"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px] w-[60px] bg-blue-600 hover:bg-blue-500 text-blue-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 