'use client';

import { MessageSquare, Phone, Mail, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { Database } from '@/lib/types/database.types';
import Link from 'next/link';

type InteractionWithAgent = Database['public']['Tables']['interactions']['Row'] & {
  agents: {
    name: string;
    role: string;
  } | null;
  tickets: {
    title: string;
    ticket_id: string;
    status: string;
  } | null;
};

interface RecentActivityProps {
  interactions: InteractionWithAgent[] | null;
}

export default function RecentActivity({ interactions = [] }: RecentActivityProps) {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'Chat':
        return <MessageSquare className="w-4 h-4" />;
      case 'Phone':
        return <Phone className="w-4 h-4" />;
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'Status':
        return <CheckCircle className="w-4 h-4" />;
      case 'Assignment':
        return <User className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'Chat':
        return 'bg-green-500/20 text-green-500';
      case 'Phone':
        return 'bg-blue-500/20 text-blue-500';
      case 'Email':
        return 'bg-purple-500/20 text-purple-500';
      case 'Status':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'Assignment':
        return 'bg-orange-500/20 text-orange-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getTimeAgo = (date: string | null) => {
    if (!date) return 'some time ago';
    
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
      
      <div className="space-y-6">
        {interactions?.map((interaction) => (
          <div key={interaction.interaction_id} className="flex space-x-4">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${getInteractionColor(interaction.interaction_type)}
            `}>
              {getInteractionIcon(interaction.interaction_type)}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white">
                    {interaction.agents?.name || 'System'}
                    {interaction.agents?.role && (
                      <span className="text-xs text-gray-400 ml-2">
                        ({interaction.agents.role})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    via {interaction.interaction_type}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {getTimeAgo(interaction.created_at)}
                </span>
              </div>
              
              {interaction.tickets && (
                <Link 
                  href={`/dashboard/customer/tickets/${interaction.tickets.ticket_id}`}
                  className="block mt-1 text-sm text-blue-400 hover:text-blue-300"
                >
                  {interaction.tickets.title}
                </Link>
              )}
              
              <p className="mt-2 text-sm text-gray-300">
                {interaction.content.length > 100
                  ? `${interaction.content.substring(0, 100)}...`
                  : interaction.content}
              </p>
              
              {interaction.tickets?.status && (
                <div className="mt-2 flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    Ticket Status: {interaction.tickets.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {(!interactions || interactions.length === 0) && (
          <div className="text-center py-4">
            <p className="text-gray-400">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
} 