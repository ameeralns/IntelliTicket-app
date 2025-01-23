import { createServerClient } from '@/lib/supabase/server';
import DashboardStats from '@/components/dashboard/customer/DashboardStats';
import ActiveTickets from '@/components/dashboard/customer/ActiveTickets';
import RecentActivity from '@/components/dashboard/customer/RecentActivity';
import KnowledgeBase from '@/components/dashboard/customer/KnowledgeBase';
import { Database } from '@/lib/types/database.types';

type CustomerWithOrg = Database['public']['Tables']['customers']['Row'] & {
  organizations: {
    name: string;
    description: string | null;
  } | null;
};

type TicketWithRelations = Database['public']['Tables']['tickets']['Row'] & {
  agents: { name: string } | null;
  teams: { name: string } | null;
};

type InteractionWithAgent = Database['public']['Tables']['interactions']['Row'] & {
  agents: { name: string } | null;
};

export default async function CustomerDashboard() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome</h1>
          <p className="mt-2 text-gray-400">Please sign in to view your dashboard</p>
        </div>
      </div>
    );
  }

  // Get customer data with organization info
  const { data: customerData } = await supabase
    .from('customers')
    .select(`
      *,
      organizations (
        name,
        description
      )
    `)
    .eq('email', session.user.email)
    .single() as { data: CustomerWithOrg | null };

  if (!customerData) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome</h1>
          <p className="mt-2 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Get tickets with related data
  const { data: ticketsData } = await supabase
    .from('tickets')
    .select(`
      *,
      agents (name),
      teams (name)
    `)
    .eq('customer_id', customerData.customer_id)
    .order('created_at', { ascending: false }) as { data: TicketWithRelations[] | null };

  // Get recent interactions with more details
  const { data: recentInteractions } = await supabase
    .from('interactions')
    .select(`
      *,
      agents (
        name,
        role
      ),
      tickets (
        title,
        ticket_id,
        status
      )
    `)
    .eq('customer_id', customerData.customer_id)
    .order('created_at', { ascending: false })
    .limit(10) as { data: InteractionWithAgent[] | null };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {customerData.name}
        </h1>
        <div className="mt-2 flex items-center">
          <span className="text-gray-400">
            Organization: {customerData.organizations?.name || 'Loading...'}
          </span>
          {customerData.organizations?.description && (
            <>
              <span className="mx-2 text-gray-600">•</span>
              <span className="text-gray-400">
                {customerData.organizations.description}
              </span>
            </>
          )}
        </div>
      </div>

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
          <KnowledgeBase customerId={customerData.customer_id} />
        </div>
      </div>
    </div>
  );
} 