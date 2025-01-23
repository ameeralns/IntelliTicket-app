'use client';

import { MessageSquare, Phone, Mail } from 'lucide-react';

interface Agent {
  name: string;
}

interface Interaction {
  interaction_id: string;
  content: string;
  interaction_type: 'Email' | 'Chat' | 'Phone';
  created_at: string;
  agents: Agent | null;
}

interface RecentActivityProps {
  interactions: Interaction[] | null;
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
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTimeAgo = (date: string) => {
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
              ${interaction.interaction_type === 'Chat' ? 'bg-green-500/20 text-green-500' :
                interaction.interaction_type === 'Phone' ? 'bg-blue-500/20 text-blue-500' :
                'bg-purple-500/20 text-purple-500'}
            `}>
              {getInteractionIcon(interaction.interaction_type)}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white">
                    {interaction.agents?.name || 'System'}
                  </p>
                  <p className="text-xs text-gray-400">
                    via {interaction.interaction_type}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {getTimeAgo(interaction.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-300">
                {interaction.content.length > 100
                  ? `${interaction.content.substring(0, 100)}...`
                  : interaction.content}
              </p>
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