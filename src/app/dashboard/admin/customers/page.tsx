'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, Search, Filter, Mail, Phone, Ticket, 
  MessageSquare, Calendar, Star, Activity, 
  Clock, AlertCircle
} from 'lucide-react';
import AdminStatCard from '@/components/dashboard/admin/AdminStatCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  tickets: Array<{
    ticket_id: string;
    status: string;
    satisfaction_score: number | null;
    created_at: string;
  }>;
  interactions: Array<{
    interaction_id: string;
    interaction_type: string;
    created_at: string;
  }>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch customers and their metrics
  const fetchCustomers = async () => {
    try {
      const { data: customersData, error } = await supabase
        .from('customers')
        .select(`
          customer_id,
          name,
          email,
          phone,
          avatar_url,
          created_at,
          tickets (
            ticket_id,
            status,
            satisfaction_score,
            created_at
          ),
          interactions (
            interaction_id,
            interaction_type,
            created_at
          )
        `);

      if (error) throw error;
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate customer metrics
  const calculateMetrics = (customer: Customer) => {
    const tickets = customer.tickets || [];
    const totalTickets = tickets.length;
    const avgSatisfaction = tickets.reduce((acc: number, ticket) => 
      acc + (ticket.satisfaction_score || 0), 0) / (totalTickets || 1);
    
    return {
      totalTickets,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      interactions: customer.interactions?.length || 0,
      activeTickets: tickets.filter(t => t.status !== 'Closed').length,
    };
  };

  // Filter and search customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    
    const metrics = calculateMetrics(customer);
    const isActive = metrics.activeTickets > 0;
    return matchesSearch && (
      (filterStatus === 'active' && isActive) ||
      (filterStatus === 'inactive' && !isActive)
    );
  });

  // Calculate overall metrics
  const overallMetrics = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => calculateMetrics(c).activeTickets > 0).length,
    avgSatisfaction: (
      customers.reduce((acc, c) => {
        const metrics = calculateMetrics(c);
        return acc + Number(metrics.avgSatisfaction);
      }, 0) / (customers.length || 1)
    ).toFixed(1),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (activeTickets: number): { variant: 'default' | 'secondary' | 'outline'; className: string } => {
    if (activeTickets > 5) {
      return { variant: 'default', className: 'bg-red-100 text-red-700 hover:bg-red-100' };
    }
    if (activeTickets > 0) {
      return { variant: 'default', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' };
    }
    return { variant: 'default', className: 'bg-green-100 text-green-700 hover:bg-green-100' };
  };

  const getSatisfactionColor = (satisfaction: number) => {
    if (!satisfaction || isNaN(satisfaction)) return 'text-gray-600';
    if (satisfaction >= 4) return 'text-green-600';
    if (satisfaction >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = (activeTickets: number) => {
    if (activeTickets > 5) return 'High Activity';
    if (activeTickets > 0) return 'Active';
    return 'Inactive';
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-6 py-8 max-w-[1400px]">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search customers..."
                className="pl-8 w-[300px] text-gray-900 placeholder:text-gray-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-white text-gray-900 border-gray-200">
                <SelectValue placeholder="Filter by status" className="text-gray-900" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all" className="text-gray-900">All Customers</SelectItem>
                <SelectItem value="active" className="text-gray-900">Active</SelectItem>
                <SelectItem value="inactive" className="text-gray-900">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AdminStatCard
            title="Total Customers"
            value={overallMetrics.totalCustomers}
            iconName="Users"
            description="Total number of customers"
          />
          <AdminStatCard
            title="Active Customers"
            value={overallMetrics.activeCustomers}
            iconName="UserCheck"
            description="Customers with active tickets"
          />
          <AdminStatCard
            title="Average Satisfaction"
            value={overallMetrics.avgSatisfaction}
            iconName="Star"
            description="Overall customer satisfaction"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12 bg-white rounded-lg">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter</p>
              </div>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const metrics = calculateMetrics(customer);
              const badgeProps = getStatusBadgeVariant(metrics.activeTickets);
              const satisfactionColor = getSatisfactionColor(Number(metrics.avgSatisfaction));
              const statusText = getStatusText(metrics.activeTickets);

              return (
                <Card key={customer.customer_id} className="overflow-hidden bg-white hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={customer.avatar_url} />
                        <AvatarFallback className="text-lg bg-gray-100 text-gray-600">
                          {customer.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{customer.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Ticket className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Total Tickets</span>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{metrics.totalTickets}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Active Tickets</span>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{metrics.activeTickets}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Satisfaction</span>
                        </div>
                        <p className={`text-2xl font-semibold ${satisfactionColor}`}>
                          {metrics.avgSatisfaction}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Interactions</span>
                        </div>
                        <p className="text-2xl font-semibold text-gray-900">{metrics.interactions}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                        </div>
                        <Badge 
                          variant={badgeProps.variant}
                          className={badgeProps.className}
                        >
                          {statusText}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
} 