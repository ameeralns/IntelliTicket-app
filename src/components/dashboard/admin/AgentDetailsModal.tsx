import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  Mail, Phone, UserCog, Building2, Users, Calendar,
  Ticket, Star, Clock, BarChart2, X, Link as LinkIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    agent_id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
    teams?: {
      name: string;
    } | null;
    metrics: {
      tickets_resolved: number;
      customer_satisfaction: number | null;
      average_response_time: number | null;
      resolution_time: number | null;
    };
    tickets: {
      total: number;
      active: number;
    };
  };
}

export default function AgentDetailsModal({ isOpen, onClose, agent }: AgentDetailsModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-semibold text-primary">
                        {agent.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-bold text-gray-900">
                        {agent.name}
                      </Dialog.Title>
                      <p className="text-lg text-gray-600 capitalize">{agent.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Contact Information */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-5 w-5 mr-3 text-gray-400" />
                          <span className="break-all">{agent.email}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Users className="h-5 w-5 mr-3 text-gray-400" />
                          <span>{agent.teams?.name || 'No Team'}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-5 w-5 mr-3 text-gray-400" />
                          <span>Joined {formatDistanceToNow(new Date(agent.created_at))} ago</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Ticket className="h-5 w-5 mr-2 text-primary" />
                            Tickets Resolved
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {agent.metrics.tickets_resolved}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Total tickets: {agent.tickets.total}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Star className="h-5 w-5 mr-2 text-yellow-500" />
                            Customer Satisfaction
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {agent.metrics.customer_satisfaction
                              ? `${(agent.metrics.customer_satisfaction * 100).toFixed(1)}%`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Clock className="h-5 w-5 mr-2 text-blue-500" />
                            Average Response Time
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {agent.metrics.average_response_time
                              ? `${Math.round(agent.metrics.average_response_time)}m`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <BarChart2 className="h-5 w-5 mr-2 text-emerald-500" />
                            Resolution Time
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {agent.metrics.resolution_time
                              ? `${Math.round(agent.metrics.resolution_time)}m`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Workload */}
                    <div className="bg-gray-50 rounded-xl p-4 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Workload</h3>
                      <div className="bg-white p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Active Tickets</span>
                          <span className="text-2xl font-bold text-primary">
                            {agent.tickets.active}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                (agent.tickets.active / (agent.tickets.total || 1)) * 100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          {agent.tickets.active} of {agent.tickets.total} tickets are active
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 