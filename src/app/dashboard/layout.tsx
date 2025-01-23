import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Add shared dashboard layout components here later */}
      {children}
    </div>
  );
} 