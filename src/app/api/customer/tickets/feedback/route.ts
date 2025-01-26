import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ticketId, satisfactionScore, comment } = await request.json();

    if (!ticketId || !satisfactionScore || satisfactionScore < 1 || satisfactionScore > 5) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      );
    }

    // Get the customer ID for the current user
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('customer_id')
      .eq('email', user.email)
      .single();

    if (customerError || !customerData) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Insert feedback using the correct column name 'rating'
    const { error: feedbackError } = await supabase
      .from('customer_feedback')
      .insert({
        ticket_id: ticketId,
        customer_id: customerData.customer_id,
        rating: satisfactionScore,
        comment: comment || null,
      });

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Update ticket satisfaction score
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ satisfaction_score: satisfactionScore })
      .eq('ticket_id', ticketId);

    if (updateError) {
      console.error('Error updating ticket satisfaction score:', updateError);
      // Don't return error since feedback was already saved
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 