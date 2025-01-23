import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>
      {/* Add admin-specific dashboard content here */}
    </div>
  );
} 