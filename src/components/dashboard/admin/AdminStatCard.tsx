'use client';

import { FC } from 'react';
import { 
  Users, 
  Ticket, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  UserCheck,
  LucideIcon,
  Building2,
  Shield,
  Settings,
  BookOpen,
  Mail,
  BarChart2,
  LayoutDashboard,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStatCardProps {
  title: string;
  value: number | string;
  description: string;
  iconName: string;
}

const iconMap: Record<string, LucideIcon> = {
  Users,
  Ticket,
  Clock,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Building2,
  Shield,
  Settings,
  BookOpen,
  Mail,
  BarChart2,
  LayoutDashboard,
  Star
};

const iconColors: Record<string, { bg: string; text: string }> = {
  Users: { bg: 'bg-blue-100', text: 'text-blue-600' },
  Ticket: { bg: 'bg-purple-100', text: 'text-purple-600' },
  Clock: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  MessageSquare: { bg: 'bg-green-100', text: 'text-green-600' },
  TrendingUp: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  UserCheck: { bg: 'bg-pink-100', text: 'text-pink-600' },
  Building2: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  Shield: { bg: 'bg-red-100', text: 'text-red-600' },
  Settings: { bg: 'bg-gray-100', text: 'text-gray-600' },
  BookOpen: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  Mail: { bg: 'bg-blue-100', text: 'text-blue-600' },
  BarChart2: { bg: 'bg-purple-100', text: 'text-purple-600' },
  LayoutDashboard: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  Star: { bg: 'bg-yellow-100', text: 'text-yellow-600' }
};

const AdminStatCard: FC<AdminStatCardProps> = ({
  title,
  value,
  description,
  iconName
}) => {
  const Icon = iconMap[iconName];
  const colors = iconColors[iconName] || { bg: 'bg-gray-100', text: 'text-gray-600' };

  if (!Icon) {
    console.warn(`Icon "${iconName}" not found in iconMap`);
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className={cn("p-3 rounded-full", colors.bg)}>
          <Icon className={cn("w-6 h-6", colors.text)} />
        </div>
      </div>
    </div>
  );
};

export default AdminStatCard; 