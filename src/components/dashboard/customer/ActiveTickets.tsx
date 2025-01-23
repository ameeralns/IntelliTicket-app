'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, AlertCircle } from 'lucide-react';
import { Database } from '@/lib/types/database.types';
import NotificationPinger from './tickets/NotificationPinger';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  agents: { name: string } | null;
  teams: { name: string } | null;
};

interface ActiveTicketsProps {
  tickets: Ticket[] | null;
}

export default function ActiveTickets({ tickets = [] }: ActiveTicketsProps) {
  const [filter, setFilter] = useState('all');

  const filteredTickets = tickets?.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['New', 'In Progress'].includes(ticket.status);
    if (filter === 'resolved') return ticket.status === 'Resolved';
    return ticket.status === filter.charAt(0).toUpperCase() + filter.slice(1);
  });

  const statusColors = {
    New: 'bg-blue-500',
    'In Progress': 'bg-yellow-500',
    Resolved: 'bg-green-500',
    Closed: 'bg-gray-500',
  } as const;

  const priorityColors = {
    Low: 'bg-gray-500',
    Medium: 'bg-blue-500',
    High: 'bg-yellow-500',
    Urgent: 'bg-red-500',
  } as const;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Active Tickets</h2>
        <div className="flex space-x-2">
          {['all', 'open', 'resolved', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-sm ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredTickets?.map((ticket) => (
          <Link
            href={`/dashboard/customer/tickets/${ticket.ticket_id}`}
            key={ticket.ticket_id}
            className="block bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-medium">{ticket.title}</h3>
                  <NotificationPinger ticketId={ticket.ticket_id} />
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(ticket.created_at || '').toLocaleDateString()}
                  </span>
                  {ticket.agents && (
                    <span>Assigned to: {ticket.agents.name}</span>
                  )}
                  {ticket.teams && (
                    <span>Team: {ticket.teams.name}</span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                    statusColors[ticket.status as keyof typeof statusColors] || 'bg-gray-500'
                  }`}
                >
                  {ticket.status}
                </span>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium text-white ${
                    priorityColors[ticket.priority as keyof typeof priorityColors] || 'bg-gray-500'
                  }`}
                >
                  {ticket.priority}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {(!filteredTickets || filteredTickets.length === 0) && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No tickets found</p>
          </div>
        )}
      </div>
    </div>
  );
} 