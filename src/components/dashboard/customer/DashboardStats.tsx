'use client';

import { Database } from '@/lib/types/database.types';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
  agents: { name: string } | null;
  teams: { name: string } | null;
};

interface DashboardStatsProps {
  tickets: Ticket[] | null;
}

export default function DashboardStats({ tickets = [] }: DashboardStatsProps) {
  // Calculate statistics
  const totalTickets = tickets?.length || 0;
  const openTickets = tickets?.filter(t => ['New', 'In Progress'].includes(t.status)).length || 0;
  const resolvedTickets = tickets?.filter(t => t.status === 'Resolved').length || 0;
  const avgSatisfaction = tickets
    ?.filter(t => t.satisfaction_score !== null)
    .reduce((acc, t) => acc + (t.satisfaction_score || 0), 0) / 
    (tickets?.filter(t => t.satisfaction_score !== null).length || 1);

  const stats = [
    {
      label: 'Total Tickets',
      value: totalTickets,
      color: 'bg-blue-500',
    },
    {
      label: 'Open Tickets',
      value: openTickets,
      color: 'bg-yellow-500',
    },
    {
      label: 'Resolved Tickets',
      value: resolvedTickets,
      color: 'bg-green-500',
    },
    {
      label: 'Avg. Satisfaction',
      value: avgSatisfaction.toFixed(1) + '/5',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-800 rounded-lg p-6 shadow-lg"
        >
          <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
            <span className="text-white text-xl font-bold">{stat.value}</span>
          </div>
          <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
        </div>
      ))}
    </div>
  );
} 