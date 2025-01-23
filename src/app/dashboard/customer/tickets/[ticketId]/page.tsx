import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import TicketHeader from '@/components/dashboard/customer/tickets/TicketHeader';
import TicketDetails from '@/components/dashboard/customer/tickets/TicketDetails';
import TicketTimeline from '@/components/dashboard/customer/tickets/TicketTimeline';
import TicketActions from '@/components/dashboard/customer/tickets/TicketActions';
import TicketReplyForm from '@/components/dashboard/customer/tickets/TicketReplyForm';
import SatisfactionRating from '@/components/dashboard/customer/tickets/SatisfactionRating';
import TicketAttachments from '@/components/dashboard/customer/tickets/TicketAttachments';

export default async function TicketPage({ params }: { params: { ticketId: string } }) {
  const supabase = createServerClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) notFound();

  // Get the ticketId directly from params - no need to await it
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

  // Ensure created_at and updated_at are not null
  const createdAt = ticket.created_at || new Date().toISOString();
  const updatedAt = ticket.updated_at || createdAt;

  // Sort interactions by date and ensure type safety
  const sortedInteractions = ticket.interactions
    .filter((interaction): interaction is typeof interaction & { created_at: string } => 
      interaction.created_at !== null
    )
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map(interaction => ({
      ...interaction,
      interaction_type: interaction.interaction_type as 'Email' | 'Chat' | 'Phone'
    }));

  const isResolved = ticket.status === 'Resolved';

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <TicketHeader
          title={ticket.title}
          status={ticket.status}
          priority={ticket.priority}
          ticketId={ticket.ticket_id}
          createdAt={createdAt}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <TicketAttachments ticketId={ticket.ticket_id} />
            
            <TicketTimeline interactions={sortedInteractions} />
            
            {/* Only show reply form if ticket is not resolved */}
            {!isResolved && <TicketReplyForm ticketId={ticket.ticket_id} />}
            
            {/* Show satisfaction rating for resolved tickets */}
            {isResolved && (
              <SatisfactionRating
                ticketId={ticket.ticket_id}
                currentRating={ticket.satisfaction_score}
                isResolved={isResolved}
              />
            )}
          </div>

          <div className="lg:col-span-1 space-y-8">
            <TicketDetails
              agent={ticket.agent}
              team={ticket.team}
              customer={ticket.customer}
              createdAt={createdAt}
              updatedAt={updatedAt}
            />

            <TicketActions
              ticketId={ticket.ticket_id}
              currentStatus={ticket.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 