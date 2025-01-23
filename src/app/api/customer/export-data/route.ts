import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createServerClient();
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (!customerData) {
    return new NextResponse('Customer not found', { status: 404 });
  }

  // Get all customer related data
  const [
    ticketsResponse,
    interactionsResponse,
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        *,
        agents (name, email),
        teams (name),
        ticket_tags (
          tags (name)
        ),
        interactions (
          content,
          created_at,
          interaction_type,
          agents (name)
        )
      `)
      .eq('customer_id', customerData.customer_id),
    supabase
      .from('interactions')
      .select(`
        *,
        agents (name)
      `)
      .eq('customer_id', customerData.customer_id),
  ]);

  const exportData = {
    personalInfo: {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      contactPreferences: customerData.contact_preferences,
      notificationSettings: customerData.notification_settings,
      createdAt: customerData.created_at,
    },
    tickets: ticketsResponse.data || [],
    interactions: interactionsResponse.data || [],
  };

  return new NextResponse(JSON.stringify(exportData), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="customer-data-${customerData.customer_id}.json"`,
    },
  });
} 