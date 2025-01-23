import { createServerClient } from '@/lib/supabase/server';
import NewTicketForm from '@/components/dashboard/customer/tickets/NewTicketForm';

export default async function NewTicket() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session?.user?.email)
    .single();

  // Get available tags
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Create New Ticket</h1>
        <NewTicketForm 
          customerId={customerData?.customer_id || ''}
          availableTags={tags || []}
        />
      </div>
    </div>
  );
} 