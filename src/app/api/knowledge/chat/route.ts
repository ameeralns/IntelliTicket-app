import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/services/OpenAIService';
import { KnowledgeEmbeddingService } from '@/lib/services/KnowledgeEmbeddingService';
import { Database } from '@/lib/types/database.types';

export async function POST(request: Request) {
  try {
    const { query, organizationId } = await request.json();
    const cookieStore = cookies();

    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    // Verify authentication
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('Authentication error:', sessionError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify user belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('agent_id, organization_id')
      .eq('agent_id', session.user.id)
      .eq('organization_id', organizationId)
      .single();

    if (agentError || !agent) {
      console.error('Organization access error:', agentError);
      return new NextResponse('Unauthorized access to organization', { status: 403 });
    }

    // Initialize services with service role for embedding search
    const embeddingService = new KnowledgeEmbeddingService();
    const openAIService = new OpenAIService();

    // Search for relevant content
    const results = await embeddingService.searchSimilarContent(query, organizationId);
    
    if (results.length === 0) {
      return NextResponse.json({
        response: "I apologize, but I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing your question or contact support for assistance."
      });
    }

    // Log the context being used
    console.log('Found relevant articles:', results.map(r => ({
      title: r.metadata.title,
      similarity: r.metadata.similarity,
      content: r.content.substring(0, 100) + '...'
    })));

    // Generate AI response
    const response = await openAIService.generateResponse(query, results);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 