import { AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TicketHeaderProps {
  title: string;
  status: string;
  priority: string;
  ticketId: string;
  createdAt: string;
}

export default function TicketHeader({
  title,
  status,
  priority,
  ticketId,
  createdAt,
}: TicketHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-500';
      case 'in progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>#{ticketId.split('-')[0]}</span>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>
                Opened {formatDistanceToNow(new Date(createdAt))} ago
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center">
            <AlertCircle className={`w-4 h-4 mr-2 ${getPriorityColor(priority)}`} />
            <span className="text-sm font-medium text-gray-200 capitalize">
              {priority} Priority
            </span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(status)}`}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
} 