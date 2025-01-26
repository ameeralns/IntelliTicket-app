"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Filter,
  Search,
  Clock,
  AlertCircle,
  User,
  Tag,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import NotificationIndicator from '@/components/dashboard/agent/NotificationIndicator';

interface RawTicketResponse {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  satisfaction_score: number | null;
  customer: { name: string; email: string; };
  tags: Array<{ tags: { name: string; } }>;
  interactions: Array<{ id: string; }>;
}

interface ExtendedTicket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
  };
  tags: {
    name: string;
  }[];
  satisfaction_score: number | null;
  interaction_count: number;
}

interface TicketsClientProps {
  initialTickets: ExtendedTicket[];
  session: any;
}

function getPriorityBadgeStyles(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800';
    case 'high':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
    default:
      return 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800';
  }
}

function getStatusBadgeStyles(status: string) {
  switch (status.toLowerCase()) {
    case 'new':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    case 'in progress':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
    case 'resolved':
      return 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800';
    case 'closed':
      return 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400 border border-gray-200 dark:border-gray-800';
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400 border border-gray-200 dark:border-gray-800';
  }
}

function getStatusCardStyles(status: string) {
  switch (status.toLowerCase()) {
    case 'new':
      return 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l-4 border-l-blue-500';
    case 'in progress':
      return 'bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-l-4 border-l-purple-500';
    case 'resolved':
      return 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 border-l-4 border-l-green-500';
    case 'closed':
      return 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-l-gray-500';
    default:
      return 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-l-gray-500';
  }
}

export default function TicketsClient({ initialTickets, session }: TicketsClientProps) {
  const [tickets, setTickets] = useState<ExtendedTicket[]>(initialTickets);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    sort: 'created_at:desc'
  });

  const supabase = createClientComponentClient();

  async function handleFilterChange(newFilters: typeof filters) {
    setFilters(newFilters);
    
    let query = supabase
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
      .eq('agent_id', session.user.id);

    if (newFilters.status && newFilters.status !== 'all') {
      query = query.eq('status', newFilters.status);
    }
    if (newFilters.priority && newFilters.priority !== 'all') {
      query = query.eq('priority', newFilters.priority);
    }
    if (newFilters.search) {
      query = query.ilike('title', '%' + newFilters.search + '%');
    }

    const [field, direction] = newFilters.sort.split(':');
    query = query.order(field, { ascending: direction === 'asc' });

    const { data: rawData, error } = await query;

    if (!error && rawData) {
      const formattedData = rawData.map((ticket: any) => {
        const formattedTicket: ExtendedTicket = {
          ticket_id: ticket.ticket_id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          satisfaction_score: ticket.satisfaction_score,
          customer: ticket.customer || { name: 'Unknown', email: 'unknown@example.com' },
          tags: (ticket.tags || [])
            .filter((t: any) => t?.tags?.name)
            .map((t: any) => ({ name: t.tags.name })),
          interaction_count: (ticket.interactions || []).length
        };
        return formattedTicket;
      });
      setTickets(formattedData);
    }
  }

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tickets</h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Manage and respond to your assigned tickets
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-0 shadow-sm bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-10 h-12 text-base bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg"
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[200px] h-12">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority}
              onValueChange={(value) => handleFilterChange({ ...filters, priority: value })}
            >
              <SelectTrigger className="w-[200px] h-12">
                <SelectValue placeholder="Filter by Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map((ticket) => (
          <Link 
            key={ticket.ticket_id}
            href={"/dashboard/agent/tickets/" + ticket.ticket_id}
            className="block group"
          >
            <Card className={"border-0 shadow-sm transition-all duration-200 overflow-hidden h-full relative " + getStatusCardStyles(ticket.status)}>
              <NotificationIndicator ticketId={ticket.ticket_id} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ticket.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{ticket.customer.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{ticket.customer.email}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={"px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 " + getStatusBadgeStyles(ticket.status)}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {ticket.status}
                    </div>
                    <div className={"px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 " + getPriorityBadgeStyles(ticket.priority)}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {ticket.priority}
                    </div>
                  </div>

                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      {ticket.tags.map((tag, index) => (
                        <span
                          key={`${ticket.ticket_id}-${tag.name || index}`}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {tag.name || ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-3 mt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 rounded-full">
                      <MessageSquare className="h-4 w-4" />
                      {ticket.interaction_count} interactions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 