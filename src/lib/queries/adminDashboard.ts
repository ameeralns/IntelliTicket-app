import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardStats {
  totalCustomers: string;
  openTickets: string;
  avgResponseTime: string;
  totalInteractions: string;
  satisfaction: string;
  activeAgents: string;
  ticketTrends: {
    customers: number;
    tickets: number;
    responseTime: number;
    interactions: number;
    satisfaction: number;
  };
}

export interface ChartData {
  name: string;
  value: number;
}

export interface RecentActivity {
  id: string;
  type: 'ticket_created' | 'ticket_updated' | 'interaction_added' | 'customer_added' | 'agent_added';
  title: string;
  description: string;
  timestamp: string;
  metadata: {
    ticketId?: string;
    customerId?: string;
    agentId?: string;
    status?: string;
  };
}

export async function fetchRecentActivities(
  supabase: SupabaseClient,
  organizationId: string
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Fetch recent tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      ticket_id,
      title,
      status,
      created_at,
      customers (name),
      agents (name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (tickets) {
    tickets.forEach(ticket => {
      activities.push({
        id: `ticket-${ticket.ticket_id}`,
        type: 'ticket_created',
        title: 'New Ticket Created',
        description: `${ticket.customers?.name} created ticket: ${ticket.title}`,
        timestamp: ticket.created_at,
        metadata: {
          ticketId: ticket.ticket_id
        }
      });
    });
  }

  // Fetch recent interactions
  const { data: interactions } = await supabase
    .from('interactions')
    .select(`
      interaction_id,
      content,
      created_at,
      tickets (title),
      agents (name),
      customers (name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (interactions) {
    interactions.forEach(interaction => {
      activities.push({
        id: `interaction-${interaction.interaction_id}`,
        type: 'interaction_added',
        title: 'New Interaction',
        description: `${interaction.agents?.name || interaction.customers?.name} added a response to ticket: ${interaction.tickets?.title}`,
        timestamp: interaction.created_at,
        metadata: {
          ticketId: interaction.tickets?.ticket_id
        }
      });
    });
  }

  // Sort all activities by timestamp
  return activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10);
}

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  organizationId: string
): Promise<DashboardStats> {
  // Get total customers
  const { count: customerCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  // Get open tickets
  const { count: openTicketCount } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'New')
    .or('status.eq.In Progress,status.eq.Assigned');

  // Get total interactions this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: interactionCount } = await supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  // Get average response time (in hours)
  const { data: avgResponseData } = await supabase
    .rpc('calculate_avg_response_time');

  // Get customer satisfaction
  const { data: satisfactionData } = await supabase
    .from('tickets')
    .select('satisfaction_score')
    .not('satisfaction_score', 'is', null);

  const avgSatisfaction = satisfactionData ? 
    satisfactionData.reduce((acc, curr) => acc + (curr.satisfaction_score || 0), 0) / 
    (satisfactionData.length || 1) : 0;

  // Get active agents
  const { count: activeAgentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  // Calculate trends (comparing to previous period)
  const prevMonth = new Date(startOfMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  const { count: prevMonthCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .lt('created_at', startOfMonth.toISOString());

  // Format numbers
  const safeCustomerCount = customerCount || 0;
  const customerTrend = ((safeCustomerCount - (prevMonthCustomers || 0)) / (prevMonthCustomers || 1)) * 100;

  return {
    totalCustomers: safeCustomerCount.toLocaleString(),
    openTickets: openTicketCount?.toLocaleString() || '0',
    avgResponseTime: `${(avgResponseData?.[0]?.avg_response_time || 0).toFixed(1)}h`,
    totalInteractions: interactionCount?.toLocaleString() || '0',
    satisfaction: `${Math.round(avgSatisfaction)}%`,
    activeAgents: activeAgentCount?.toLocaleString() || '0',
    ticketTrends: {
      customers: Math.round(customerTrend),
      tickets: -5, // TODO: Implement actual calculation
      responseTime: 15, // TODO: Implement actual calculation
      interactions: 8, // TODO: Implement actual calculation
      satisfaction: 3, // TODO: Implement actual calculation
    }
  };
}

export async function fetchTicketVolumeData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ChartData[]> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: ChartData[] = [];

  // Get last 7 days of tickets
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());

    result.push({
      name: days[d.getDay()],
      value: count || 0
    });
  }

  return result;
}

export async function fetchSatisfactionTrendData(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ChartData[]> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: ChartData[] = [];

  // Get last 7 days of satisfaction scores
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('tickets')
      .select('satisfaction_score')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .not('satisfaction_score', 'is', null);

    const avgScore = data?.reduce((acc, curr) => acc + curr.satisfaction_score, 0) / (data?.length || 1);

    result.push({
      name: days[d.getDay()],
      value: Math.round(avgScore || 0)
    });
  }

  return result;
} 