'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminStatCard from '@/components/dashboard/admin/AdminStatCard';
import AdminChart from '@/components/dashboard/admin/AdminChart';
import RecentActivityList from '@/components/dashboard/admin/RecentActivityList';
import { 
  fetchDashboardStats, 
  fetchTicketVolumeData, 
  fetchSatisfactionTrendData,
  fetchRecentActivities,
  type DashboardStats,
  type ChartData,
  type RecentActivity
} from '@/lib/queries/adminDashboard';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: '0',
    openTickets: '0',
    avgResponseTime: '0h',
    totalInteractions: '0',
    satisfaction: '0%',
    activeAgents: '0',
    ticketTrends: {
      customers: 0,
      tickets: 0,
      responseTime: 0,
      interactions: 0,
      satisfaction: 0
    }
  });

  const [ticketData, setTicketData] = useState<ChartData[]>([]);
  const [satisfactionData, setSatisfactionData] = useState<ChartData[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClientComponentClient();

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get the organization ID from the current user's metadata
        const { data: { user } } = await supabase.auth.getUser();
        const organizationId = user?.user_metadata?.organization_id;
        
        if (!organizationId) {
          throw new Error('No organization ID found');
        }

        // Fetch all data in parallel
        const [dashboardStats, volumeData, satisfactionTrend, recentActivities] = await Promise.all([
          fetchDashboardStats(supabase, organizationId),
          fetchTicketVolumeData(supabase, organizationId),
          fetchSatisfactionTrendData(supabase, organizationId),
          fetchRecentActivities(supabase, organizationId)
        ]);

        setStats(dashboardStats);
        setTicketData(volumeData);
        setSatisfactionData(satisfactionTrend);
        setActivities(recentActivities);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up real-time subscriptions
    const ticketsSubscription = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => fetchData()
      )
      .subscribe();

    const interactionsSubscription = supabase
      .channel('interactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interactions'
        },
        () => fetchData()
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(ticketsSubscription);
      supabase.removeChannel(interactionsSubscription);
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl bg-rose-50 p-4">
          <h3 className="text-sm font-medium text-rose-800">Error loading dashboard</h3>
          <div className="mt-2 text-sm text-rose-700">{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded-md w-1/4"></div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-[400px] bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your organization's performance and metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard
          title="Total Customers"
          value={stats.totalCustomers}
          iconName="Users"
          trend={{ value: stats.ticketTrends.customers, isPositive: stats.ticketTrends.customers > 0 }}
          description="Active customers in your organization"
        />
        <AdminStatCard
          title="Open Tickets"
          value={stats.openTickets}
          iconName="Ticket"
          trend={{ value: Math.abs(stats.ticketTrends.tickets), isPositive: stats.ticketTrends.tickets < 0 }}
          description="Tickets requiring attention"
        />
        <AdminStatCard
          title="Avg. Response Time"
          value={stats.avgResponseTime}
          iconName="Clock"
          trend={{ value: stats.ticketTrends.responseTime, isPositive: stats.ticketTrends.responseTime < 0 }}
          description="Average first response time"
        />
        <AdminStatCard
          title="Total Interactions"
          value={stats.totalInteractions}
          iconName="MessageSquare"
          trend={{ value: stats.ticketTrends.interactions, isPositive: stats.ticketTrends.interactions > 0 }}
          description="Customer interactions this month"
        />
        <AdminStatCard
          title="Customer Satisfaction"
          value={stats.satisfaction}
          iconName="TrendingUp"
          trend={{ value: stats.ticketTrends.satisfaction, isPositive: stats.ticketTrends.satisfaction > 0 }}
          description="Overall satisfaction rate"
        />
        <AdminStatCard
          title="Active Agents"
          value={stats.activeAgents}
          iconName="UserCheck"
          description="Agents currently online"
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminChart
          title="Ticket Volume (Last 7 Days)"
          data={ticketData}
        />
        <AdminChart
          title="Customer Satisfaction Trend"
          data={satisfactionData}
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <RecentActivityList activities={activities} />
          </div>
        </div>
      </div>
    </div>
  );
} 