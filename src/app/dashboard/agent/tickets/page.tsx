import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import TicketsClient from './tickets-client';

export default async function TicketsPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata.role !== 'agent') {
    redirect('/login');
  }

  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers!customer_id(
          name,
          email
        ),
        ticket_tags(
          tag:tags(
            name
          )
        ),
        interactions(
          interaction_id
        )
      `)
      .eq('agent_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTickets = (tickets || []).map(ticket => ({
      ticket_id: ticket.ticket_id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at || new Date().toISOString(),
      updated_at: ticket.updated_at || new Date().toISOString(),
      satisfaction_score: ticket.satisfaction_score,
      customer: ticket.customer || { name: 'Unknown', email: 'unknown@example.com' },
      tags: (ticket.ticket_tags || [])
        .filter(t => t?.tag?.name)
        .map(t => ({ name: t.tag.name })),
      interaction_count: (ticket.interactions || []).length
    }));

    return <TicketsClient initialTickets={formattedTickets} session={session} />;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return <div>Error loading tickets. Please try again later.</div>;
  }
} 