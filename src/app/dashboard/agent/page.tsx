import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  TrendingUp,
  TrendingDown,
  LucideIcon,
  User,
  Clock as ClockIcon,
  Ticket,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import Link from "next/link";

type StatColor = "blue" | "green" | "red" | "purple";

interface Stat {
  name: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend: string;
  trendDirection: "up" | "down";
  color: StatColor;
}

interface RawTicket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  customer: {
    name: string;
  } | null;
}

interface Ticket {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  customer: {
    name: string;
  };
}

interface AgentMetrics {
  activeTickets: number;
  resolvedToday: number;
  slaBreaches: number;
  avgResponseTime: number;
  activeTicketsTrend: number;
  resolvedTodayTrend: number;
  slaBreachesTrend: number;
  avgResponseTimeTrend: number;
}

const colorStyles: Record<StatColor, string> = {
  blue: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  green: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
  purple: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
};

const iconColors: Record<StatColor, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400"
};

function getPriorityBadgeStyles(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
    default:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800';
  }
}

function getStatusBadgeStyles(status: string) {
  switch (status.toLowerCase()) {
    case 'new':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    case 'in progress':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800';
    case 'resolved':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  }
}

async function getAgentMetrics(supabase: any, agentId: string): Promise<AgentMetrics> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get active tickets count
  const { count: activeTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .in('status', ['New', 'Assigned', 'In Progress']);

  // Get resolved tickets today
  const { count: resolvedToday } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .eq('status', 'Resolved')
    .gte('updated_at', startOfDay);

  // Get SLA breaches
  const { data: slaSettings } = await supabase
    .from('system_settings')
    .select('settings_value')
    .eq('settings_key', 'sla_settings')
    .single();

  const { count: slaBreaches } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .in('status', ['New', 'Assigned', 'In Progress'])
    .lt('created_at', new Date(now.getTime() - (slaSettings?.settings_value?.medium || 24) * 60 * 60 * 1000).toISOString());

  // Calculate average response time
  const { data: interactions } = await supabase
    .from('interactions')
    .select('created_at, tickets!inner(created_at)')
    .eq('agent_id', agentId)
    .gte('created_at', lastWeekStart);

  let totalResponseTime = 0;
  if (interactions) {
    interactions.forEach((interaction: any) => {
      const responseTime = new Date(interaction.created_at).getTime() - new Date(interaction.tickets.created_at).getTime();
      totalResponseTime += responseTime;
    });
  }
  const avgResponseTime = interactions?.length ? Math.round(totalResponseTime / (interactions.length * 1000 * 60)) : 0;

  // Calculate trends (comparing to last week)
  const { count: lastWeekActive } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .in('status', ['New', 'Assigned', 'In Progress'])
    .lt('created_at', lastWeekStart);

  const activeTicketsTrend = lastWeekActive ? ((activeTickets - lastWeekActive) / lastWeekActive) * 100 : 0;

  return {
    activeTickets,
    resolvedToday,
    slaBreaches,
    avgResponseTime,
    activeTicketsTrend,
    resolvedTodayTrend: 12.5, // This would need historical data comparison
    slaBreachesTrend: -5.2,   // This would need historical data comparison
    avgResponseTimeTrend: -12.3 // This would need historical data comparison
  };
}

async function getRecentTickets(supabase: any, agentId: string): Promise<Ticket[]> {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('ticket_id, title, status, priority, created_at, customer:customer_id(name)')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }

  return (tickets || []).map((ticket: RawTicket) => ({
    ...ticket,
    customer: {
      name: ticket.customer?.name || 'Unknown Customer'
    }
  }));
}

export default async function AgentDashboard() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata.role !== 'agent') {
    redirect('/login');
  }

  const metrics = await getAgentMetrics(supabase, session.user.id);
  const recentTickets = await getRecentTickets(supabase, session.user.id);

  const stats: Stat[] = [
    {
      name: "Active Tickets",
      value: metrics.activeTickets.toString(),
      description: "Open tickets assigned to you",
      icon: Clock,
      trend: metrics.activeTicketsTrend.toFixed(1) + "%",
      trendDirection: metrics.activeTicketsTrend >= 0 ? "up" : "down",
      color: "blue"
    },
    {
      name: "Resolved Today",
      value: metrics.resolvedToday.toString(),
      description: "Tickets resolved in last 24h",
      icon: CheckCircle2,
      trend: metrics.resolvedTodayTrend.toFixed(1) + "%",
      trendDirection: metrics.resolvedTodayTrend >= 0 ? "up" : "down",
      color: "green"
    },
    {
      name: "SLA Breaches",
      value: metrics.slaBreaches.toString(),
      description: "Tickets close to SLA breach",
      icon: AlertCircle,
      trend: metrics.slaBreachesTrend.toFixed(1) + "%",
      trendDirection: metrics.slaBreachesTrend >= 0 ? "up" : "down",
      color: "red"
    },
    {
      name: "Avg. Response Time",
      value: metrics.avgResponseTime + "m",
      description: "Average first response time",
      icon: BarChart2,
      trend: metrics.avgResponseTimeTrend.toFixed(1) + "%",
      trendDirection: metrics.avgResponseTimeTrend >= 0 ? "up" : "down",
      color: "purple"
    },
  ];

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 p-6 rounded-lg">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome back, {session.user.user_metadata.name || 'Agent'}! 👋
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Here's what's happening with your tickets today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trendDirection === "up" ? TrendingUp : TrendingDown;
          
          return (
            <Card 
              key={stat.name} 
              className={"relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all " + colorStyles[stat.color]}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">
                  {stat.name}
                </CardTitle>
                <Icon className={"h-5 w-5 " + iconColors[stat.color]} />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={"flex items-center text-sm font-semibold " + 
                        (stat.trendDirection === "up"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                        )}
                    >
                      <TrendIcon className="h-4 w-4 mr-1" />
                      {stat.trend}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">vs last week</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-2 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Recent Tickets</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">Your most recent ticket assignments and updates</CardDescription>
              </div>
              <Link 
                href="/dashboard/agent/tickets" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all tickets →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <Link 
                    href={"/dashboard/agent/tickets/" + ticket.ticket_id}
                    key={ticket.ticket_id} 
                    className="block"
                  >
                    <div className="p-4 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-900 transition-all bg-white dark:bg-gray-800 hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-grow">
                          <div className="flex items-center gap-2">
                            <div className={"px-2.5 py-0.5 rounded-full text-xs font-medium border " + getPriorityBadgeStyles(ticket.priority)}>
                              {ticket.priority}
                            </div>
                            <div className={"px-2.5 py-0.5 rounded-full text-xs font-medium border " + getStatusBadgeStyles(ticket.status)}>
                              {ticket.status}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {ticket.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-4">
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <User className="h-4 w-4 mr-1" />
                                <span>{ticket.customer?.name || 'Unknown Customer'}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={
                          "w-2 h-12 rounded-full ml-4 " + 
                          (ticket.priority === 'Urgent' ? 'bg-red-500' :
                           ticket.priority === 'High' ? 'bg-orange-500' :
                           ticket.priority === 'Medium' ? 'bg-yellow-500' :
                           'bg-green-500')
                        } />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <Ticket className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    No recent tickets
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    New tickets assigned to you will appear here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Performance Overview</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Your ticket handling metrics</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Response Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.resolvedToday > 0 ? 
                      ((metrics.resolvedToday / (metrics.activeTickets + metrics.resolvedToday)) * 100).toFixed(1) + "%" : 
                      '0%'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Average Resolution Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.avgResponseTime}m</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 