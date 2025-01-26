'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Clock, Tag, MessageSquare } from 'lucide-react';
import { subDays } from 'date-fns';

interface Agent {
  name: string;
  email: string;
}

interface Team {
  name: string;
}

interface Tag {
  name: string;
}

interface TicketTag {
  tags: Tag;
}

interface Interaction {
  content: string;
  created_at: string;
  interaction_type: string;
  agents: {
    name: string;
  } | null;
}

interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  agents: Agent | null;
  teams: Team | null;
  ticket_tags: TicketTag[];
  interactions: Interaction[];
}

interface TicketListProps {
  tickets: Ticket[];
  filters?: {
    status: string[];
    priority: string[];
    dateRange: 'all' | 'week' | 'month' | 'year';
  };
}

export default function TicketList({ tickets, filters = { status: [], priority: [], dateRange: 'all' } }: TicketListProps) {
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedTickets = useMemo(() => {
    // First, apply filters
    let filtered = [...tickets];

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(ticket => filters.status.includes(ticket.status));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(ticket => filters.priority.includes(ticket.priority));
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = subDays(now, {
        week: 7,
        month: 30,
        year: 365
      }[filters.dateRange]);

      filtered = filtered.filter(ticket => 
        new Date(ticket.created_at) >= cutoffDate
      );
    }

    // Then, sort the filtered results
    return filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return sortOrder === 'desc' 
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'desc'
        ? b[sortBy].localeCompare(a[sortBy])
        : a[sortBy].localeCompare(b[sortBy]);
    });
  }, [tickets, filters, sortBy, sortOrder]);

  // Separate tickets into active and closed
  const { activeTickets, closedTickets } = useMemo(() => {
    return filteredAndSortedTickets.reduce(
      (acc, ticket) => {
        if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
          acc.closedTickets.push(ticket);
        } else {
          acc.activeTickets.push(ticket);
        }
        return acc;
      },
      { activeTickets: [] as Ticket[], closedTickets: [] as Ticket[] }
    );
  }, [filteredAndSortedTickets]);

  const statusColors = {
    New: 'bg-blue-500',
    'In Progress': 'bg-yellow-500',
    Resolved: 'bg-green-500',
    Closed: 'bg-gray-500',
    Assigned: 'bg-purple-500',
  };

  const priorityColors = {
    Low: 'bg-gray-500',
    Medium: 'bg-blue-500',
    High: 'bg-yellow-500',
    Urgent: 'bg-red-500',
  };

  const renderTicket = (ticket: Ticket) => (
    <Link
      key={ticket.ticket_id}
      href={`/dashboard/customer/tickets/${ticket.ticket_id}`}
      className="block bg-gray-700 rounded-lg p-6 hover:bg-gray-600 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-white">{ticket.title}</h3>
          <p className="text-gray-400 line-clamp-2">{ticket.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {new Date(ticket.created_at).toLocaleDateString()}
            </span>
            {ticket.agents && (
              <span>Assigned to: {ticket.agents.name}</span>
            )}
            {ticket.teams && (
              <span>Team: {ticket.teams.name}</span>
            )}
          </div>

          {/* Tags */}
          {ticket.ticket_tags && ticket.ticket_tags.length > 0 && (
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <div className="flex gap-2">
                {ticket.ticket_tags.map((tt) => (
                  <span
                    key={tt.tags.name}
                    className="px-2 py-1 bg-gray-600 text-xs rounded-full text-gray-300"
                  >
                    {tt.tags.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className="flex space-x-2">
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                statusColors[ticket.status as keyof typeof statusColors]
              }`}
            >
              {ticket.status}
            </span>
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                priorityColors[ticket.priority as keyof typeof priorityColors]
              }`}
            >
              {ticket.priority}
            </span>
          </div>

          {/* Latest interaction indicator */}
          {ticket.interactions && ticket.interactions.length > 0 && (
            <div className="flex items-center text-gray-400 text-sm">
              <MessageSquare className="w-4 h-4 mr-1" />
              <span>{ticket.interactions.length} messages</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* Sorting Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-end mb-6 space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'created_at' | 'priority' | 'status')}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          >
            <option value="created_at">Date</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Active Tickets Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Active Tickets</h2>
        <div className="space-y-4">
          {activeTickets.map(renderTicket)}
          {activeTickets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No active tickets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Closed Tickets Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Resolved & Closed Tickets</h2>
        <div className="space-y-4">
          {closedTickets.map(renderTicket)}
          {closedTickets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No resolved or closed tickets found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 