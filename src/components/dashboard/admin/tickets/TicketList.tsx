'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UserPlus, UserMinus, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Database } from '@/lib/supabase/database.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AssignAgentModal from './AssignAgentModal';
import ReassignAgentModal from './ReassignAgentModal';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { cn } from '@/lib/utils';

type DBTicket = Database['public']['Tables']['tickets']['Row'];
type DBCustomer = Database['public']['Tables']['customers']['Row'];
type DBAgent = Database['public']['Tables']['agents']['Row'];

type Ticket = DBTicket & {
  customers: Pick<DBCustomer, 'name' | 'email'>;
  agents: Pick<DBAgent, 'name' | 'email'> | null;
};

interface TicketListProps {
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  isAssigned: boolean;
  isClosed?: boolean;
}

export default function TicketList({ 
  searchQuery, 
  statusFilter, 
  priorityFilter,
  isAssigned,
  isClosed = false
}: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('tickets-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  async function fetchTickets() {
    try {
      setLoading(true);

      let query = supabase
        .from('tickets')
        .select(`
          *,
          customers (
            name,
            email
          ),
          agents (
            name,
            email
          )
        `);

      if (isClosed) {
        query = query.eq('status', 'Closed');
      } else {
        query = query.neq('status', 'Closed');
        
        if (isAssigned) {
          query = query.not('agent_id', 'is', null);
        } else {
          query = query.is('agent_id', null);
        }
      }

      if (!isClosed && statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      if (priorityFilter && priorityFilter !== 'All') {
        query = query.eq('priority', priorityFilter);
      }

      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (isClosed) {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      const transformedTickets = (ticketsData || []).map(ticket => ({
        ...ticket,
        customers: ticket.customers as Ticket['customers'],
        agents: ticket.agents as Ticket['agents']
      }));

      if (searchQuery && searchQuery.trim()) {
        const search = searchQuery.trim().toLowerCase();
        
        const filteredTickets = transformedTickets.filter(ticket => {
          const customerMatch = ticket.customers?.name.toLowerCase().includes(search) ||
                              ticket.customers?.email.toLowerCase().includes(search);
          const agentMatch = (isAssigned || isClosed) && ticket.agents?.name.toLowerCase().includes(search);
          
          return customerMatch || agentMatch;
        });

        setTickets(filteredTickets);
      } else {
        setTickets(transformedTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAssignmentComplete = () => {
    setAssigningTicket(null);
    fetchTickets();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 border border-blue-200',
      'Assigned': 'bg-purple-100 text-purple-800 border border-purple-200',
      'Reassigned': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'Resolved': 'bg-green-100 text-green-800 border border-green-200',
      'Closed': 'bg-gray-100 text-gray-700 border border-gray-200'
    };
    return colors[status] || colors['New'];
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Low': 'bg-slate-100 text-slate-700 border border-slate-200',
      'Medium': 'bg-blue-100 text-blue-700 border border-blue-200',
      'High': 'bg-orange-100 text-orange-700 border border-orange-200',
      'Urgent': 'bg-red-100 text-red-700 border border-red-200'
    };
    return colors[priority] || colors['Low'];
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return formatDistanceToNow(new Date(date));
  };

  const preventDefaultContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTickets = tickets.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-gray-600">Loading tickets...</div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-gray-600">
          {isClosed 
            ? 'No closed tickets found'
            : isAssigned 
              ? 'No assigned tickets found' 
              : 'No unassigned tickets found'
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
        onContextMenu={preventDefaultContextMenu}
      >
        {currentTickets.map((ticket) => (
          <div key={ticket.ticket_id} onContextMenu={preventDefaultContextMenu}>
            <ContextMenu.Root>
              <ContextMenu.Trigger asChild>
                <div className="h-full">
                  <Card className={cn(
                    "overflow-hidden bg-white hover:shadow-lg transition-shadow h-full cursor-context-menu border-gray-200",
                    isClosed ? "opacity-75" : "shadow-sm"
                  )}>
                    <div className="p-5">
                      <div className="flex gap-2 mb-3">
                        <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                      </div>

                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{ticket.title}</h3>

                      <p className="text-gray-600 text-sm mb-4">{ticket.description}</p>

                      <div className="flex items-center gap-3">
                        <Avatar className="border border-gray-200">
                          <AvatarFallback className="bg-gray-100 text-gray-700">
                            {ticket.customers.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ticket.customers.name}</p>
                          <p className="text-xs text-gray-500">{ticket.customers.email}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Created {formatDate(ticket.created_at)} ago</span>
                          {ticket.agents && (
                            <span className="font-medium text-gray-700">
                              Assigned to {ticket.agents.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </ContextMenu.Trigger>

              <ContextMenu.Portal>
                <ContextMenu.Content 
                  className="min-w-[200px] bg-white rounded-md shadow-md border border-gray-200 p-1 z-50"
                >
                  {!isClosed && (
                    <ContextMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-sm cursor-pointer outline-none"
                      onSelect={() => setAssigningTicket(ticket)}
                    >
                      {isAssigned ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Reassign Ticket</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Assign Ticket</span>
                        </>
                      )}
                    </ContextMenu.Item>
                  )}
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-8 h-8 rounded-md text-sm font-medium",
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {assigningTicket && !isClosed && (
        isAssigned ? (
          <ReassignAgentModal
            isOpen={!!assigningTicket}
            onClose={() => setAssigningTicket(null)}
            ticketId={assigningTicket.ticket_id}
            currentAgentId={assigningTicket.agent_id!}
            currentAgentName={assigningTicket.agents?.name || 'Unknown'}
            onReassigned={handleAssignmentComplete}
          />
        ) : (
          <AssignAgentModal
            isOpen={!!assigningTicket}
            onClose={() => setAssigningTicket(null)}
            ticketId={assigningTicket.ticket_id}
            currentAgentId={assigningTicket.agent_id}
            onAssigned={handleAssignmentComplete}
          />
        )
      )}
    </div>
  );
} 