'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Loader2, Plus, Mail, Phone, UserCog, Building2, Users, 
  Ticket, Star, Clock, BarChart2, X, Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AgentDetailsModal from '@/components/dashboard/admin/AgentDetailsModal';

interface Agent {
  agent_id: string;
  name: string;
  email: string;
  role: string;
  team_id: string | null;
  organization_id: string;
  created_at: string;
  teams?: {
    name: string;
    team_id: string;
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
}

export default function AgentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();

      // Get the current user's organization
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', user?.email)
        .single();
      
      if (agentError) throw agentError;
      
      setOrganizationId(agentData.organization_id);

      // Fetch all agents with their team info
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          *,
          teams (
            name,
            team_id
          )
        `)
        .eq('organization_id', agentData.organization_id);

      if (agentsError) throw agentsError;

      // Fetch metrics for each agent
      const agentsWithMetrics = await Promise.all(
        agentsData.map(async (agent) => {
          try {
            // Get active tickets count
            const { count: activeTickets, error: activeError } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agent.agent_id)
              .in('status', ['New', 'Assigned', 'In Progress']);

            if (activeError) throw activeError;

            // Get total tickets count
            const { count: totalTickets, error: totalError } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agent.agent_id);

            if (totalError) throw totalError;

            // Get resolved tickets count
            const { count: resolvedTickets, error: resolvedError } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agent.agent_id)
              .in('status', ['Resolved', 'Closed']);

            if (resolvedError) throw resolvedError;

            // Get average satisfaction
            const { data: satisfactionData, error: satisfactionError } = await supabase
              .from('tickets')
              .select('satisfaction_score')
              .eq('agent_id', agent.agent_id)
              .not('satisfaction_score', 'is', null)
              .in('status', ['Resolved', 'Closed']);

            if (satisfactionError) throw satisfactionError;

            const avgSatisfaction = satisfactionData?.length
              ? satisfactionData.reduce((acc, ticket) => acc + (ticket.satisfaction_score || 0), 0) / (satisfactionData.length * 5)
              : null;

            // Get average response time from first interaction
            const { data: responseTimeData, error: responseError } = await supabase
              .from('interactions')
              .select('created_at, ticket_id')
              .eq('agent_id', agent.agent_id)
              .order('created_at', { ascending: true });

            if (responseError) throw responseError;

            // Group first responses by ticket
            const firstResponses: Record<string, string> = responseTimeData.reduce((acc, interaction) => {
              if (!acc[interaction.ticket_id]) {
                acc[interaction.ticket_id] = interaction.created_at;
              }
              return acc;
            }, {} as Record<string, string>);

            // Get ticket creation times
            const { data: ticketData, error: ticketError } = await supabase
              .from('tickets')
              .select('ticket_id, created_at')
              .in('ticket_id', Object.keys(firstResponses));

            if (ticketError) throw ticketError;

            // Calculate average response time
            const responseTimes = ticketData.map(ticket => {
              const responseTime = new Date(firstResponses[ticket.ticket_id]).getTime() - new Date(ticket.created_at).getTime();
              return responseTime / (1000 * 60); // Convert to minutes
            });

            const avgResponseTime = responseTimes.length
              ? responseTimes.reduce((acc, time) => acc + time, 0) / responseTimes.length
              : null;

            // Get average resolution time
            const { data: resolutionData, error: resolutionError } = await supabase
              .from('tickets')
              .select('created_at, updated_at')
              .eq('agent_id', agent.agent_id)
              .in('status', ['Resolved', 'Closed']);

            if (resolutionError) throw resolutionError;

            const avgResolutionTime = resolutionData?.length
              ? resolutionData.reduce((acc, ticket) => {
                  const created = new Date(ticket.created_at);
                  const resolved = new Date(ticket.updated_at);
                  return acc + (resolved.getTime() - created.getTime()) / (1000 * 60);
                }, 0) / resolutionData.length
              : null;

            return {
              ...agent,
              metrics: {
                tickets_resolved: resolvedTickets || 0,
                customer_satisfaction: avgSatisfaction,
                average_response_time: avgResponseTime,
                resolution_time: avgResolutionTime
              } as Agent['metrics'],
              tickets: {
                total: totalTickets || 0,
                active: activeTickets || 0
              }
            };
          } catch (error) {
            console.error(`Error fetching metrics for agent ${agent.agent_id}:`, error);
            return {
              ...agent,
              metrics: {
                tickets_resolved: 0,
                customer_satisfaction: null,
                average_response_time: null,
                resolution_time: null
              } as Agent['metrics'],
              tickets: {
                total: 0,
                active: 0
              }
            };
          }
        })
      );

      setAgents(agentsWithMetrics);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    // Exclude admin role from display
    if (agent.role === 'admin') return false;
    
    // Role filtering
    const matchesRole = filterRole === 'all' || agent.role.toLowerCase() === filterRole.toLowerCase();
    
    // Team filtering - check both team_id and team name
    const matchesTeam = filterTeam === 'all' || 
      (agent.teams?.name && agent.teams.name.toLowerCase() === filterTeam.toLowerCase());
    
    // Search by name, email, role, or team
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
      agent.name.toLowerCase().includes(searchLower) ||
      agent.email.toLowerCase().includes(searchLower) ||
      agent.role.toLowerCase().includes(searchLower) ||
      (agent.teams?.name && agent.teams.name.toLowerCase().includes(searchLower));
    
    return matchesRole && matchesTeam && matchesSearch;
  });

  // Get unique team names for the filter dropdown
  const teamOptions = Array.from(new Set(
    agents
      .filter(agent => agent.role !== 'admin' && agent.teams?.name)
      .map(agent => agent.teams?.name)
  )).filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Agents</h1>
          <p className="mt-2 text-base text-gray-600">
            Manage and monitor your organization's agents
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/admin/agents/new')}
          className="inline-flex items-center px-8 py-4 text-lg font-bold text-gray-900 bg-white hover:bg-gray-50 rounded-xl shadow-xl hover:shadow-2xl transform transition-all duration-200 hover:scale-105 active:scale-95 ring-2 ring-primary border border-primary"
        >
          <Plus className="h-6 w-6 mr-2 text-primary" />
          Add New Agent
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Search Bar */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Agents
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="Search by name, email, role, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-900 placeholder:text-gray-500 bg-white"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full min-w-[160px] px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-900 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <div>
              <label htmlFor="team-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Team
              </label>
              <select
                id="team-filter"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full min-w-[160px] px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-900 cursor-pointer"
              >
                <option value="all">All Teams</option>
                {teamOptions.map(teamName => (
                  teamName && (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  )
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        <div className="mt-4 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery('')}
                className="ml-2 text-primary hover:text-primary/80"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {filterRole !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
              Role: {filterRole}
              <button
                onClick={() => setFilterRole('all')}
                className="ml-2 text-blue-700 hover:text-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
          {filterTeam !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
              Team: {filterTeam}
              <button
                onClick={() => setFilterTeam('all')}
                className="ml-2 text-green-700 hover:text-green-600"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 gap-8">
        {filteredAgents.map((agent) => (
          <div
            key={agent.agent_id}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-8 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Agent Info */}
              <div className="lg:col-span-1">
                <div className="flex items-start space-x-5">
                  <div className="h-14 w-14 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 truncate">{agent.name}</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-base text-gray-600">
                        <Mail className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{agent.email}</span>
                      </div>
                      <div className="flex items-center text-base text-gray-600">
                        <UserCog className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="capitalize truncate">{agent.role}</span>
                      </div>
                      <div className="flex items-center text-base text-gray-600">
                        <Users className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{agent.teams?.name || 'No Team'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="lg:col-span-2">
                <h4 className="text-base font-medium text-gray-700 mb-4">Performance Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Ticket className="h-5 w-5 mr-2 flex-shrink-0 text-primary" />
                      <span className="truncate">Tickets Resolved</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {agent.metrics?.tickets_resolved || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Star className="h-5 w-5 mr-2 flex-shrink-0 text-yellow-500" />
                      <span className="truncate">Satisfaction</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {agent.metrics?.customer_satisfaction ? 
                        `${(agent.metrics.customer_satisfaction * 100).toFixed(1)}%` : 
                        'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Clock className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500" />
                      <span className="truncate">Avg Response</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {agent.metrics?.average_response_time ? 
                        `${Math.round(agent.metrics.average_response_time)}m` : 
                        'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <BarChart2 className="h-5 w-5 mr-2 flex-shrink-0 text-emerald-500" />
                      <span className="truncate">Resolution Time</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {agent.metrics?.resolution_time ? 
                        `${Math.round(agent.metrics.resolution_time)}m` : 
                        'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Workload */}
              <div className="lg:col-span-1">
                <h4 className="text-base font-medium text-gray-700 mb-4">Current Workload</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Active Tickets</span>
                      <span className="text-2xl font-bold text-primary">
                        {agent.tickets?.active || 0}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(
                            ((agent.tickets?.active || 0) / (agent.tickets?.total || 1)) * 100, 
                            100
                          )}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-base text-gray-600 font-medium">
                    Total Tickets: {agent.tickets?.total || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <AgentDetailsModal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          agent={selectedAgent}
        />
      )}

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <UserCog className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No agents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {agents.length === 0 
              ? "Get started by adding your first agent"
              : "No agents match your current filters"}
          </p>
          {agents.length === 0 && (
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard/admin/agents/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Agent
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 