import { createServerClient } from '@/lib/supabase/server';
import TicketList from '@/components/dashboard/customer/tickets/TicketList';
import TicketFilters from '@/components/dashboard/customer/tickets/TicketFilters';

export default async function CustomerTickets() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session?.user?.email)
    .single();

  // Get tickets with related data
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      *,
      agents (
        name,
        email
      ),
      teams (
        name
      ),
      ticket_tags (
        tags (
          name
        )
      ),
      interactions (
        content,
        created_at,
        interaction_type,
        agents (
          name
        )
      )
    `)
    .eq('customer_id', customerData?.customer_id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <a
          href="/dashboard/customer/tickets/new"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Create New Ticket
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <TicketFilters />
        </div>

        {/* Tickets List */}
        <div className="lg:col-span-3">
          <TicketList tickets={tickets || []} />
        </div>
      </div>
    </div>
  );
} 