'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X } from 'lucide-react';
import { Database } from '@/lib/types/database.types';

interface AssignAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentAgentId: string | null;
  onAssigned: () => void;
}

type Agent = {
  agent_id: string;
  name: string;
  email: string;
  active_tickets: number;
};

export default function AssignAgentModal({
  isOpen,
  onClose,
  ticketId,
  currentAgentId,
  onAssigned
}: AssignAgentModalProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    if (isOpen) {
      loadAgents();
    } else {
      // Reset state when modal closes
      setSelectedAgent('');
      setError(null);
    }
  }, [isOpen]);

  async function loadAgents() {
    try {
      setLoading(true);
      setError(null);

      // Get the organization_id from the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('No authenticated user found');

      // Get the organization_id from the agents table
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();
      if (agentError) throw agentError;

      // Fetch all agents from the same organization
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('agent_id, name, email')
        .eq('organization_id', agentData.organization_id);
      if (agentsError) throw agentsError;

      // Count active tickets for each agent using a separate query
      const ticketCounts = new Map<string, number>();
      
      // Get all active tickets
      const { data: activeTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('agent_id')
        .eq('organization_id', agentData.organization_id)
        .in('status', ['New', 'Assigned', 'Reassigned', 'In Progress'])
        .not('status', 'eq', 'Closed');
      
      if (ticketsError) throw ticketsError;

      // Count tickets per agent
      activeTickets?.forEach(ticket => {
        if (ticket.agent_id) {
          ticketCounts.set(
            ticket.agent_id, 
            (ticketCounts.get(ticket.agent_id) || 0) + 1
          );
        }
      });

      // Combine agent data with ticket counts and sort by workload
      const agentsWithWorkload = agentsData.map(agent => ({
        ...agent,
        active_tickets: ticketCounts.get(agent.agent_id) || 0
      })).sort((a, b) => a.active_tickets - b.active_tickets);

      setAgents(agentsWithWorkload);
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('Failed to load agents. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgent) return;

    try {
      setSubmitting(true);
      setError(null);

      // Get the organization_id from the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.email) throw new Error('No authenticated user found');

      // Get the organization_id from the agents table
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('organization_id, team_id')
        .eq('email', session.user.email)
        .single();
      if (agentError) throw agentError;

      // Get the selected agent's team_id
      const { data: selectedAgentData, error: selectedAgentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('agent_id', selectedAgent)
        .single();
      if (selectedAgentError) throw selectedAgentError;

      const updates = {
        agent_id: selectedAgent,
        team_id: selectedAgentData.team_id,
        status: 'Assigned',
        updated_at: new Date().toISOString(),
        organization_id: agentData.organization_id
      };

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('ticket_id', ticketId)
        .eq('organization_id', agentData.organization_id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Failed to update ticket');
      }

      onAssigned();
      onClose();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      setError('Failed to assign ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentAgentId ? 'Reassign Ticket' : 'Assign Ticket'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="agent"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Agent
              </label>
              <select
                id="agent"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading || submitting}
              >
                <option value="">Select an agent...</option>
                {agents.map((agent) => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.name} ({agent.active_tickets} active tickets)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedAgent || submitting}
              >
                {submitting ? 'Assigning...' : currentAgentId ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 