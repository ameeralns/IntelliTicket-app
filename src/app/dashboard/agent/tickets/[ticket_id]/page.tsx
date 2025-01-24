import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import TicketDetailsClient from './ticket-details-client';

export default async function TicketDetailsPage({
  params,
}: {
  params: { ticket_id: string }
}) {
  const cookieStore = cookies();
  const supabase = createServerClient();

  // Get and verify the session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Additional security check using getUser
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (!session || !user || userError || user.user_metadata.role !== 'agent') {
    redirect('/login');
  }

  // Fetch ticket details with related data
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers!customer_id(
        name,
        email,
        phone,
        avatar_url
      ),
      ticket_tags(
        tag:tags(
          name
        )
      ),
      interactions(
        interaction_id,
        content,
        interaction_type,
        created_at,
        agent:agents(name),
        customer:customers(name),
        attachments(*)
      )
    `)
    .eq('ticket_id', params.ticket_id)
    .single();

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    redirect('/dashboard/agent/tickets');
  }

  return (
    <TicketDetailsClient 
      ticket={ticket} 
      session={session}
    />
  );
} 