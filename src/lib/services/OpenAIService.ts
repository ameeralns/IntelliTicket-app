import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.systemPrompt = `You are a helpful AI assistant that provides concise and relevant information based on the knowledge base articles provided. Follow these rules:

1. Keep responses brief and to the point (2-3 sentences for the main answer)
2. Always recommend relevant articles for further reading
3. Use simple, clear language
4. Format responses in this structure:
   - Brief answer
   - "📚 Related Articles:" section listing relevant articles
5. Only use information from the provided knowledge base articles
6. If the articles don't contain relevant information, politely say so
7. Never make up information or use external knowledge`;
  }

  async generateResponse(userMessage: string, context: Array<{ title: string; content: string }>) {
    try {
      // Format context text
      const contextText = context
        .map(article => `Article: ${article.title}\n${article.content}\n---`)
        .join('\n\n');

      // Format user message to explicitly request using context
      const formattedUserMessage = `Based on the provided knowledge base articles, please provide a concise answer to: ${userMessage}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: `Knowledge Base Articles:\n\n${contextText}\n\nUser Question: ${formattedUserMessage}` }
        ],
        temperature: 0.7,
        max_tokens: 500 // Reduced token limit to encourage shorter responses
      });

      return response.choices[0].message.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }
} 