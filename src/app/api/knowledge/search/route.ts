import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeEmbeddingService } from '@/lib/services/KnowledgeEmbeddingService';
import { Database } from '@/lib/types/database.types';

export async function POST(request: NextRequest) {
  try {
    const { organizationId, query } = await request.json();

    if (!organizationId || !query) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the request is authenticated and authorized
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the user belongs to the organization
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('organization_id')
      .eq('agent_id', user.id)
      .single();

    if (agentError || !agent || agent.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Search the knowledge base
    const embeddingService = new KnowledgeEmbeddingService(organizationId);
    const results = await embeddingService.searchSimilarContent(query);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 