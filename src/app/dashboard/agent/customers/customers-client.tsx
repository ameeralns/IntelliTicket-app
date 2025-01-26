'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, SlidersHorizontal, Users2, BarChart3, Clock } from 'lucide-react';
import CustomerList from './components/CustomerList';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';

type Customer = Database['public']['Tables']['customers']['Row'] & {
  _count?: {
    tickets: number;
    open_tickets: number;
  };
};

type TicketWithStatus = {
  status: string;
};

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearch, sortBy, filterStatus]);

  useEffect(() => {
    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      
      // First, get the current agent's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      // Get the agent's details
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('agent_id, organization_id')
        .eq('email', user.email)
        .single();

      if (agentError || !agentData) throw agentError || new Error('Agent not found');

      // Get all tickets assigned to the agent to find relevant organizations
      const { data: agentTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('customer_id')
        .eq('agent_id', agentData.agent_id);

      if (ticketsError) throw ticketsError;

      // Get unique customer IDs from agent's tickets
      const customerIds = [...new Set(agentTickets.map(t => t.customer_id))];
      
      if (customerIds.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Get customers with their tickets
      let query = supabase
        .from('customers')
        .select(`
          *,
          tickets!customer_id(status)
        `)
        .in('customer_id', customerIds);

      // Apply search filter if exists
      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
        );
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'name':
          query = query.order('name');
          break;
        case 'tickets':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process the data to count tickets
      const processedCustomers = (data || []).reduce((acc: Customer[], current) => {
        const tickets = current.tickets as TicketWithStatus[];
        const customer = {
          ...current,
          tickets: undefined,
          _count: {
            tickets: tickets.length,
            open_tickets: tickets.filter(t => t.status === 'Open').length
          }
        };
        
        // Apply status filter
        if (filterStatus === 'active' && customer._count.open_tickets === 0) {
          return acc;
        }
        
        acc.push(customer);
        return acc;
      }, []);

      setCustomers(processedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Customers</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {customers.length}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Users2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                <Clock className="w-3 h-3 mr-1" />
                Active Now
              </Badge>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {customers.filter(c => c._count?.open_tickets || 0 > 0).length} with active tickets
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="relative overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base font-medium"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge 
                variant="outline" 
                className="h-10 px-4 flex items-center gap-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
              </Badge>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SelectItem value="recent" className="text-gray-900 dark:text-white font-medium">Most Recent</SelectItem>
                  <SelectItem value="name" className="text-gray-900 dark:text-white font-medium">Name</SelectItem>
                  <SelectItem value="tickets" className="text-gray-900 dark:text-white font-medium">Ticket Count</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SelectItem value="all" className="text-gray-900 dark:text-white font-medium">All Customers</SelectItem>
                  <SelectItem value="active" className="text-gray-900 dark:text-white font-medium">Active Tickets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 via-blue-500 to-gray-200 dark:from-gray-800 dark:to-gray-800" />
      </Card>

      <CustomerList 
        customers={customers}
        loading={loading}
      />
    </div>
  );
} 