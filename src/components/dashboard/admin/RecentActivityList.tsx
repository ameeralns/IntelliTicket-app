'use client';

import { FC } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { MessageSquare, User, Ticket, ArrowRight } from 'lucide-react';
import { type RecentActivity } from '@/lib/queries/adminDashboard';
import { cn } from '@/lib/utils';

interface RecentActivityListProps {
  activities: RecentActivity[];
}

const RecentActivityList: FC<RecentActivityListProps> = ({ activities }) => {
  const getActivityStyles = (type: RecentActivity['type']): { icon: JSX.Element; bg: string; ring: string } => {
    switch (type) {
      case 'interaction_added':
        return {
          icon: <MessageSquare className="h-5 w-5 text-blue-600" />,
          bg: 'bg-blue-50',
          ring: 'ring-blue-50'
        };
      case 'customer_added':
        return {
          icon: <User className="h-5 w-5 text-emerald-600" />,
          bg: 'bg-emerald-50',
          ring: 'ring-emerald-50'
        };
      case 'agent_added':
        return {
          icon: <User className="h-5 w-5 text-purple-600" />,
          bg: 'bg-purple-50',
          ring: 'ring-purple-50'
        };
      case 'ticket_created':
        return {
          icon: <Ticket className="h-5 w-5 text-indigo-600" />,
          bg: 'bg-indigo-50',
          ring: 'ring-indigo-50'
        };
      case 'ticket_updated':
        return {
          icon: <Ticket className="h-5 w-5 text-orange-600" />,
          bg: 'bg-orange-50',
          ring: 'ring-orange-50'
        };
      default:
        return {
          icon: null,
          bg: 'bg-gray-50',
          ring: 'ring-gray-50'
        };
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No recent activity to display</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => {
          const styles = getActivityStyles(activity.type);
          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span
                    className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white",
                      styles.bg
                    )}>
                      {styles.icon}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {activity.title}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {activity.metadata.ticketId && (
                      <div className="mt-2">
                        <Link
                          href={`/dashboard/admin/tickets/${activity.metadata.ticketId}`}
                          className="inline-flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                          <span>View ticket details</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecentActivityList; 