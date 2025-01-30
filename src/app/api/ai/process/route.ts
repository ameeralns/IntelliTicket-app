import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Langfuse } from 'langfuse';
import { AutoCRMService } from '@/lib/services/ai/AutoCRMService';

// Initialize Langfuse
const langfuse = process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
  ? new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL
    })
  : null;

export async function POST(request: Request) {
  try {
    const { query, organizationId } = await request.json();

    if (!query || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get authenticated Supabase client
    const supabase = createServerComponentClient({ cookies });

    // Initialize AutoCRM service
    const autoCRM = new AutoCRMService({
      organizationId,
      supabase,
      langfuse,
      openAIApiKey: process.env.OPENAI_API_KEY || ''
    });

    // Process the query
    const { response, traceId } = await autoCRM.processUserQuery(query);

    return NextResponse.json({
      success: true,
      response,
      traceId
    });

  } catch (error) {
    console.error('Error processing AI query:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
} 