'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import TicketHeader from './TicketHeader';
import TicketDetails from './TicketDetails';
import TicketTimeline from './TicketTimeline';
import TicketActions from './TicketActions';
import TicketReplyForm from './TicketReplyForm';
import SatisfactionRating from './SatisfactionRating';
import TicketAttachments from './TicketAttachments';

interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string | null;
  updated_at: string | null;
  satisfaction_score: number | null;
  customer: {
    name: string;
    email: string;
  };
  agent: {
    name: string;
    email: string;
  } | null;
  team: {
    name: string;
  } | null;
  interactions: Array<{
    interaction_id: string;
    content: string;
    interaction_type: 'Email' | 'Chat' | 'Phone';
    created_at: string | null;
    agent: { name: string } | null;
    customer: { name: string } | null;
  }>;
}

interface TicketContentProps {
  initialTicket: Ticket;
}

export default function TicketContent({ initialTicket }: TicketContentProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const supabase = createClientComponentClient();

  // Set up real-time subscription for interactions
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticket.ticket_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interactions',
          filter: `ticket_id=eq.${ticket.ticket_id}`,
        },
        async (payload) => {
          // Fetch the new interaction with related data
          const { data: newInteraction } = await supabase
            .from('interactions')
            .select(`
              interaction_id,
              content,
              interaction_type,
              created_at,
              agent:agents(name),
              customer:customers(name)
            `)
            .eq('interaction_id', payload.new.interaction_id)
            .single();

          if (newInteraction) {
            const typedInteraction = {
              interaction_id: newInteraction.interaction_id,
              content: newInteraction.content,
              interaction_type: newInteraction.interaction_type as 'Email' | 'Chat' | 'Phone',
              created_at: newInteraction.created_at,
              agent: newInteraction.agent && newInteraction.agent[0] ? { name: newInteraction.agent[0].name } : null,
              customer: newInteraction.customer && newInteraction.customer[0] ? { name: newInteraction.customer[0].name } : null
            };
            
            setTicket(prev => ({
              ...prev,
              interactions: [typedInteraction, ...prev.interactions]
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.ticket_id]);

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

  const isTicketClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';

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
            
            {/* Only show reply form if ticket is not closed or resolved */}
            {!isTicketClosed && <TicketReplyForm ticketId={ticket.ticket_id} />}
            
            {/* Show satisfaction rating for closed tickets */}
            {isTicketClosed && (
              <SatisfactionRating
                ticketId={ticket.ticket_id}
                currentRating={ticket.satisfaction_score}
                isResolved={true}
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