import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/services/OpenAIService';
import { KnowledgeEmbeddingService } from '@/lib/services/KnowledgeEmbeddingService';
import { Database } from '@/lib/types/database.types';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    // Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request data
    const { message, organizationId } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user belongs to the organization
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('organization_id')
      .eq('email', session.user.email)
      .single();

    if (customerError || !customer?.organization_id) {
      console.error('Customer error:', customerError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify the user is querying their own organization
    if (customer.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Unauthorized access to organization' }, { status: 403 });
    }

    // Search for relevant content
    const embeddingService = new KnowledgeEmbeddingService();
    const searchResults = await embeddingService.searchSimilarContent(message, organizationId);

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ 
        response: "I apologize, but I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing your question or contact support for assistance." 
      });
    }

    // Log found articles for debugging
    console.log(`Found ${searchResults.length} relevant articles for organization ${organizationId}`);
    searchResults.forEach((result, index) => {
      console.log(`Article ${index + 1}: ${result.metadata.title} (similarity: ${result.similarity})`);
    });

    // Format context for OpenAI
    const context = searchResults.map(result => ({
      title: result.metadata.title,
      content: result.content
    }));

    // Generate AI response
    const openAI = new OpenAIService();
    const response = await openAI.generateResponse(message, context);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
} 