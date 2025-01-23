import { MessageCircle, Mail, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Interaction {
  interaction_id: string;
  content: string;
  interaction_type: 'Email' | 'Chat' | 'Phone';
  created_at: string;
  agent?: { name: string } | null;
  customer?: { name: string } | null;
}

interface TicketTimelineProps {
  interactions: Interaction[];
}

export default function TicketTimeline({ interactions }: TicketTimelineProps) {
  const getInteractionIcon = (type: Interaction['interaction_type']) => {
    switch (type) {
      case 'Email':
        return <Mail className="w-5 h-5" />;
      case 'Chat':
        return <MessageCircle className="w-5 h-5" />;
      case 'Phone':
        return <Phone className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getInteractionColor = (type: Interaction['interaction_type']) => {
    switch (type) {
      case 'Email':
        return 'bg-blue-500';
      case 'Chat':
        return 'bg-green-500';
      case 'Phone':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-center">No interactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Ticket Timeline</h2>
      <div className="space-y-6">
        {interactions.map((interaction) => (
          <div key={interaction.interaction_id} className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-10 bottom-0 w-px bg-gray-700" />

            <div className="flex items-start space-x-4">
              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${getInteractionColor(interaction.interaction_type)}`}>
                {getInteractionIcon(interaction.interaction_type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">
                    {interaction.agent?.name || interaction.customer?.name || 'Unknown User'}
                  </h3>
                  <span className="text-sm text-gray-400">
                    {formatDistanceToNow(new Date(interaction.created_at))} ago
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-300 whitespace-pre-wrap">
                  {interaction.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 