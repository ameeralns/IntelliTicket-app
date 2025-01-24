import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TicketContent from '@/components/dashboard/customer/tickets/TicketContent';

export default async function TicketPage({ params }: { params: { ticketId: string } }) {
  const supabase = createServerClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) notFound();

  // Get the ticketId directly from params
  const { ticketId } = params;
  if (!ticketId) notFound();

  // Fetch ticket data with related information
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      customer:customers(name, email),
      agent:agents(name, email),
      team:teams(name),
      interactions(
        interaction_id,
        content,
        interaction_type,
        created_at,
        agent:agents(name),
        customer:customers(name)
      )
    `)
    .eq('ticket_id', ticketId)
    .single();

  if (ticketError) throw ticketError;
  if (!ticket) notFound();

  // Ensure the customer owns this ticket
  if (ticket.customer.email !== session.user.email) notFound();

  return <TicketContent initialTicket={ticket} />;
} 