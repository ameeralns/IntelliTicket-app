'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Mail, Phone, Clock, Ticket, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CustomerDetailsDialog from './CustomerDetailsDialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Customer = Database['public']['Tables']['customers']['Row'] & {
  _count?: {
    tickets: number;
    open_tickets: number;
  };
};

interface CustomerListProps {
  customers: Customer[];
  loading: boolean;
}

export default function CustomerList({ customers, loading }: CustomerListProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const logEmailInteraction = async (customer: Customer) => {
    try {
      // Get the current agent's email
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user?.email) throw new Error('Not authenticated');

      // Get the agent's details
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('email', authData.user.email)
        .single();

      if (agentError || !agentData) throw agentError || new Error('Agent not found');

      // Get all tickets for this customer that are assigned to the current agent
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('ticket_id')
        .eq('customer_id', customer.customer_id)
        .eq('agent_id', agentData.agent_id);

      if (ticketsError) throw ticketsError;

      if (!tickets || tickets.length === 0) {
        toast.error('No tickets found for this customer');
        return;
      }

      // Create an interaction for each ticket
      const interactions = tickets.map(ticket => ({
        ticket_id: ticket.ticket_id,
        interaction_type: 'Email',
        content: `Email sent to ${customer.email}`,
        agent_id: agentData.agent_id
      }));

      // Log the interactions
      const { error: interactionError } = await supabase
        .from('interactions')
        .insert(interactions);

      if (interactionError) throw interactionError;
      toast.success('Email interactions logged successfully');
    } catch (error) {
      console.error('Error logging email interaction:', error);
      toast.error('Failed to log email interaction');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 space-y-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="p-8 text-center border border-gray-200 dark:border-gray-800">
        <div className="text-gray-500 dark:text-gray-400">No customers found</div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <Card 
            key={customer.customer_id}
            className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            onClick={() => setSelectedCustomer(customer)}
          >
            {/* Quick Action Overlay */}
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full bg-gray-900/5 backdrop-blur-sm hover:bg-gray-900/10 dark:bg-white/10 dark:hover:bg-white/20"
              >
                <ArrowUpRight className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Header with Avatar and Basic Info */}
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-900 shadow-md">
                  <AvatarImage src={customer.avatar_url || undefined} />
                  <AvatarFallback className="bg-blue-500 text-white font-medium">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
                    {customer.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">
                      Updated {formatDistanceToNow(new Date(customer.updated_at))} ago
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 truncate">{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-300">{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Ticket Statistics */}
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="secondary" 
                  className="h-6 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0"
                >
                  <Ticket className="w-3 h-3 mr-1" />
                  {customer._count?.tickets || 0} Total
                </Badge>
                {(customer._count?.open_tickets || 0) > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-6 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0"
                  >
                    {customer._count?.open_tickets} Open
                  </Badge>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={async (e) => {
                    e.stopPropagation(); // Prevent opening the details dialog
                    await logEmailInteraction(customer);
                    window.location.href = `mailto:${customer.email}`;
                  }}
                >
                  <Mail className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">Email</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the details dialog
                    router.push(`/dashboard/agent/tickets?search=${encodeURIComponent(customer.name)}`);
                  }}
                >
                  <Ticket className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-700 dark:text-gray-300">View Tickets</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CustomerDetailsDialog
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  );
} 