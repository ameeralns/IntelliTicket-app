import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CustomerSidebar from '@/components/dashboard/customer/CustomerSidebar';
import { Database } from '@/lib/types/database.types';

interface CustomerData {
  customer_id: string;
  name: string;
  email: string;
  organization_id: string;
  contact_preferences?: {
    email: boolean;
    phone: boolean;
  };
  notification_settings?: {
    ticket_updates: boolean;
    marketing: boolean;
  };
}

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Session error:', sessionError);
    redirect('/login');
  }

  if (!session?.user?.email || session.user.user_metadata.role !== 'customer') {
    redirect('/login');
  }

  // Get customer data for the sidebar
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (customerError || !customerData) {
    console.error('Customer data error:', customerError);
    redirect('/error?message=Customer not found');
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <CustomerSidebar customerData={customerData as CustomerData} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 