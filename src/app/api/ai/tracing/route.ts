import { NextResponse } from 'next/server';
import { Langfuse } from 'langfuse';

// Initialize Langfuse with both public and secret keys
const langfuse = new Langfuse({
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create_trace':
        const newTrace = await langfuse.trace({
          ...data,
          // Add any server-side metadata
          source: 'server',
          timestamp: new Date()
        });
        return NextResponse.json({ success: true, traceId: newTrace.id });

      case 'update_trace':
        const { traceId, metadata } = data;
        const existingTrace = langfuse.trace({ id: traceId });
        await existingTrace.update(metadata);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Langfuse API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 