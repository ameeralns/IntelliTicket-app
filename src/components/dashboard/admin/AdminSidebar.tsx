'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Ticket,
  BookOpen,
  Mail,
  LucideIcon,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminProfile {
  name: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name: string | null;
}

interface AgentWithOrg {
  agent_id: string;
  name: string;
  email: string;
  role: string;
  organization_id: string;
  organizations: {
    name: string;
  };
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  UserCog,
  Ticket,
  BookOpen,
  Mail
};

const AdminSidebar: FC = () => {
  const pathname = usePathname();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClientComponentClient();
      
      // Get the current user's session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to get user session');
      }

      if (!user) {
        throw new Error('No user found');
      }

      // Get the agent's details including organization ID
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select(`
          agent_id,
          name,
          email,
          role,
          organization_id,
          organizations (
            name
          )
        `)
        .eq('email', user.email)
        .single<AgentWithOrg>();

      if (agentError) {
        throw new Error(`Error fetching agent: ${agentError.message}`);
      }

      if (!agentData) {
        throw new Error('No agent data found');
      }

      setProfile({
        name: agentData.name,
        email: agentData.email,
        role: agentData.role,
        organization_id: agentData.organization_id,
        organization_name: agentData.organizations?.name || null
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard/admin',
      icon: 'LayoutDashboard',
      current: pathname === '/dashboard/admin'
    },
    {
      name: 'Teams',
      href: '/dashboard/admin/teams',
      icon: 'Users',
      current: pathname.startsWith('/dashboard/admin/teams')
    },
    {
      name: 'Agents',
      href: '/dashboard/admin/agents',
      icon: 'UserCog',
      current: pathname.startsWith('/dashboard/admin/agents')
    },
    {
      name: 'Customers',
      href: '/dashboard/admin/customers',
      icon: 'Users',
      current: pathname.startsWith('/dashboard/admin/customers')
    },
    {
      name: 'Tickets',
      href: '/dashboard/admin/tickets',
      icon: 'Ticket',
      current: pathname.startsWith('/dashboard/admin/tickets')
    },
    {
      name: 'Knowledge Base',
      href: '/dashboard/admin/knowledge',
      icon: 'BookOpen',
      current: pathname.startsWith('/dashboard/admin/knowledge')
    },
    {
      name: 'Email Templates',
      href: '/dashboard/admin/email-templates',
      icon: 'Mail',
      current: pathname.startsWith('/dashboard/admin/email-templates')
    }
  ];

  return (
    <div className="flex h-full flex-col bg-white border-r">
      {/* Organization name */}
      <div className="px-4 py-4 border-b">
        <Link 
          href="/dashboard/admin/profile"
          className="block hover:opacity-80 transition-opacity"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {profile?.organization_name || 'Loading...'}
          </h2>
          <p className="text-sm text-gray-500">Admin Dashboard</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                item.current
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    item.current
                      ? 'text-gray-500'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
              )}
              {item.name}
              {item.current && (
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminSidebar; 