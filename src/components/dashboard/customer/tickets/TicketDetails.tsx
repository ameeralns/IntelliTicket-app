import { User, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TicketDetailsProps {
  agent: {
    name: string;
    email: string;
  } | null;
  team: {
    name: string;
  } | null;
  customer: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TicketDetails({
  agent,
  team,
  customer,
  createdAt,
  updatedAt,
}: TicketDetailsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Ticket Details</h2>
      
      <div className="space-y-6">
        {/* Assigned Agent */}
        <div className="flex items-start">
          <User className="w-5 h-5 text-indigo-500 mt-1 mr-3 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-200">Assigned Agent</h3>
            {agent ? (
              <div className="mt-1">
                <p className="text-sm text-white">{agent.name}</p>
                <p className="text-sm text-gray-400 truncate">{agent.email}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not yet assigned</p>
            )}
          </div>
        </div>

        {/* Assigned Team */}
        <div className="flex items-start">
          <Users className="w-5 h-5 text-indigo-500 mt-1 mr-3 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-200">Assigned Team</h3>
            {team ? (
              <p className="mt-1 text-sm text-white truncate">{team.name}</p>
            ) : (
              <p className="text-sm text-gray-400">Not yet assigned</p>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-start">
          <User className="w-5 h-5 text-indigo-500 mt-1 mr-3 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-200">Customer</h3>
            <div className="mt-1">
              <p className="text-sm text-white">{customer.name}</p>
              <p className="text-sm text-gray-400 truncate" title={customer.email}>
                {customer.email}
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-start">
          <Calendar className="w-5 h-5 text-indigo-500 mt-1 mr-3 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-200">Dates</h3>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-400">
                Created: {format(new Date(createdAt), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="text-sm text-gray-400">
                Last Updated: {format(new Date(updatedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 