import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = createServerClient();
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Get customer data
  const { data: customerData } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('email', session.user.email)
    .single();

  if (!customerData) {
    return new NextResponse('Customer not found', { status: 404 });
  }

  // Begin transaction to delete all customer data
  const { error: deleteError } = await supabase.rpc('delete_customer_data', {
    p_customer_id: customerData.customer_id
  });

  if (deleteError) {
    console.error('Error deleting customer data:', deleteError);
    return new NextResponse('Error deleting account', { status: 500 });
  }

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(
    session.user.id
  );

  if (authError) {
    console.error('Error deleting auth user:', authError);
    return new NextResponse('Error deleting account', { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
} 