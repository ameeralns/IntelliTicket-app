import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/dashboard/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.user_metadata.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 z-50 w-64 flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 ml-64">
        <main className="flex min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
} 