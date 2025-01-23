import { createServerClient } from '@/lib/supabase/server';
import DashboardStats from '@/components/dashboard/customer/DashboardStats';
import ActiveTickets from '@/components/dashboard/customer/ActiveTickets';
import RecentActivity from '@/components/dashboard/customer/RecentActivity';
import KnowledgeBase from '@/components/dashboard/customer/KnowledgeBase';

export default async function CustomerDashboard() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session?.user?.email)
    .single();

  // Get tickets with related data
  const { data: ticketsData } = await supabase
    .from('tickets')
    .select(`
      *,
      agents (name),
      teams (name)
    `)
    .eq('customer_id', customerData?.customer_id)
    .order('created_at', { ascending: false });

  const { data: recentInteractions } = await supabase
    .from('interactions')
    .select(`
      *,
      agents (name)
    `)
    .eq('customer_id', customerData?.customer_id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Quick Stats */}
      <DashboardStats tickets={ticketsData} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Active Tickets Section - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActiveTickets tickets={ticketsData} />
        </div>

        {/* Right Sidebar - Takes 1 column */}
        <div className="space-y-8">
          <RecentActivity interactions={recentInteractions} />
          <KnowledgeBase customerId={customerData?.customer_id} />
        </div>
      </div>
    </div>
  );
} 