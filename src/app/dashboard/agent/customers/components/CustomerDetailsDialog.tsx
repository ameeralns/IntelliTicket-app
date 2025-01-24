'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Phone, Clock, Ticket, MessageSquare, Settings, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type Customer = Database['public']['Tables']['customers']['Row'] & {
  _count?: {
    tickets: number;
    open_tickets: number;
  };
};

type CustomerTicket = Database['public']['Tables']['tickets']['Row'] & {
  interactions: Database['public']['Tables']['interactions']['Row'][];
};

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerDetailsDialog({ 
  customer, 
  onClose 
}: CustomerDetailsDialogProps) {
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (customer) {
      fetchCustomerTickets();
    }
  }, [customer]);

  async function fetchCustomerTickets() {
    if (!customer) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          interactions (*)
        `)
        .eq('customer_id', customer.customer_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching customer tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!customer) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'New': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'In Progress': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Resolved': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Closed': 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[status as keyof typeof colors] || colors['New'];
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Low': 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      'Medium': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'High': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Urgent': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[priority as keyof typeof colors] || colors['Low'];
  };

  return (
    <Dialog open={!!customer} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Customer Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(85vh-65px)]">
          {/* Customer Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-900/50">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 ring-2 ring-white dark:ring-gray-900 shadow-lg">
                <AvatarImage src={customer.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-500 text-white text-xl font-medium">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {customer.name}
                </h2>
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Mail className="w-4 h-4 mr-1.5" />
                    <span className="text-sm">{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Phone className="w-4 h-4 mr-1.5" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Ticket className="w-3 h-3 mr-1" />
                    {customer._count?.tickets || 0} Total Tickets
                  </Badge>
                  {(customer._count?.open_tickets || 0) > 0 && (
                    <Badge variant="destructive" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {customer._count?.open_tickets} Open
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-800" />

          {/* Tabs Content */}
          <Tabs defaultValue="tickets" className="flex-1 overflow-hidden">
            <TabsList className="w-full h-auto p-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="container flex gap-6 px-6">
                <TabsTrigger 
                  value="tickets" 
                  className="relative h-12 px-4 font-medium data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Tickets
                </TabsTrigger>
                <TabsTrigger 
                  value="interactions" 
                  className="relative h-12 px-4 font-medium data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Interactions
                </TabsTrigger>
                <TabsTrigger 
                  value="preferences" 
                  className="relative h-12 px-4 font-medium data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent border-0 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </TabsTrigger>
              </div>
            </TabsList>

            <TabsContent 
              value="tickets" 
              className="flex-1 overflow-hidden bg-white dark:bg-gray-900/30 border-none p-0 outline-none"
            >
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {tickets.length === 0 ? (
                    <Card className="p-8 text-center border border-gray-200 dark:border-gray-800">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                          <Ticket className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">No tickets found</div>
                      </div>
                    </Card>
                  ) : (
                    tickets.map((ticket) => (
                      <Card 
                        key={ticket.ticket_id} 
                        className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status === 'New' && <AlertCircle className="w-3 h-3 mr-1" />}
                                  {ticket.status === 'Resolved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {ticket.status}
                                </Badge>
                                <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {ticket.title}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {ticket.description}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1.5" />
                              {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center">
                              <MessageSquare className="w-4 h-4 mr-1.5" />
                              {ticket.interactions.length} interactions
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent 
              value="interactions" 
              className="flex-1 overflow-hidden bg-white dark:bg-gray-900/30 border-none p-0 outline-none"
            >
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {tickets.length === 0 ? (
                    <Card className="p-8 text-center border border-gray-200 dark:border-gray-800">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                          <MessageSquare className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">No interactions found</div>
                      </div>
                    </Card>
                  ) : (
                    tickets.map(ticket => (
                      <div key={ticket.ticket_id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {ticket.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {ticket.status}
                          </Badge>
                        </div>
                        {ticket.interactions.map(interaction => (
                          <Card 
                            key={interaction.interaction_id} 
                            className="overflow-hidden border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow"
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                                      {interaction.interaction_type}
                                    </Badge>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {formatDistanceToNow(new Date(interaction.created_at))} ago
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {interaction.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent 
              value="preferences" 
              className="flex-1 overflow-hidden bg-white dark:bg-gray-900/30 border-none p-0 outline-none"
            >
              <ScrollArea className="h-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Contact Preferences
                  </h3>
                  <div className="space-y-6">
                    {customer.contact_preferences ? (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">Email Contact</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {customer.contact_preferences.email ? 'Enabled' : 'Disabled'}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant={customer.contact_preferences.email ? "default" : "secondary"}
                              className={customer.contact_preferences.email 
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}
                            >
                              {customer.contact_preferences.email ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">Phone Contact</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {customer.contact_preferences.phone ? 'Enabled' : 'Disabled'}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant={customer.contact_preferences.phone ? "default" : "secondary"}
                              className={customer.contact_preferences.phone 
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}
                            >
                              {customer.contact_preferences.phone ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                          <Settings className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">No preferences set</div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 