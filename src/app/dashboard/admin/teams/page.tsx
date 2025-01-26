'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, Plus, Pencil, Trash2, Users, X, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Team {
  team_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  _count?: {
    agents: number;
  }
}

interface TeamWithAgentCount extends Team {
  agent_count: number;
}

interface Agent {
  agent_id: string;
  name: string;
  email: string;
  role: string;
}

interface TeamDetailsModalProps {
  isOpen: boolean;
  team: TeamWithAgentCount;
  onClose: () => void;
  onAgentRemoved: () => void;
}

function TeamDetailsModal({ isOpen, team, onClose, onAgentRemoved }: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchTeamAgents();
    fetchAvailableAgents();
  }, [team.team_id]);

  const fetchTeamAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('agent_id, name, email, role')
        .eq('team_id', team.team_id);

      if (error) throw error;

      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching team agents:', error);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAgents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No authenticated user found');

      // Get the organization_id from the agents table
      const { data: currentAgent, error: agentError } = await supabase
        .from('agents')
        .select('organization_id')
        .eq('email', session.user.email)
        .single();
      
      if (agentError) throw agentError;

      // Fetch agents without a team from the same organization
      const { data, error } = await supabase
        .from('agents')
        .select('agent_id, name, email, role')
        .eq('organization_id', currentAgent.organization_id)
        .is('team_id', null);

      if (error) throw error;

      setAvailableAgents(data || []);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      setError('Failed to load available agents');
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('agents')
        .update({ team_id: null })
        .eq('agent_id', agentId);

      if (error) throw error;

      setAgents(agents.filter(agent => agent.agent_id !== agentId));
      setAvailableAgents([...availableAgents, agents.find(agent => agent.agent_id === agentId)!]);
      onAgentRemoved();
    } catch (error) {
      console.error('Error removing agent:', error);
      setError('Failed to remove team member');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddAgent = async () => {
    if (!selectedAgent) return;

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('agents')
        .update({ team_id: team.team_id })
        .eq('agent_id', selectedAgent);

      if (error) throw error;

      const addedAgent = availableAgents.find(agent => agent.agent_id === selectedAgent)!;
      setAgents([...agents, addedAgent]);
      setAvailableAgents(availableAgents.filter(agent => agent.agent_id !== selectedAgent));
      setSelectedAgent('');
      onAgentRemoved(); // This will update the agent count in the parent component
    } catch (error) {
      console.error('Error adding agent:', error);
      setError('Failed to add team member');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{team.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{team.description || 'No description'}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Add Agent Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>
            <div className="flex gap-3">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                disabled={processing}
              >
                <option value="">Select an agent...</option>
                {availableAgents.map((agent) => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.name} - {agent.email}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddAgent}
                disabled={!selectedAgent || processing}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm transition-all duration-200 hover:shadow-md"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Team Members Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                {agents.length} members
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200">
                <Users className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No team members yet</p>
                <p className="text-gray-400 text-sm mt-1">Add agents to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.agent_id}
                    className="flex items-center justify-between bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-100 hover:shadow-sm transition-shadow group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">
                          {agent.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-500">{agent.email}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                          {agent.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAgent(agent.agent_id)}
                      disabled={processing}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from team"
                    >
                      {processing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <UserMinus className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(team.created_at).toLocaleString()}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(team.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithAgentCount[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithAgentCount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [processing, setProcessing] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
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

      // Fetch teams with agent count
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          agent_count:agents(count)
        `)
        .eq('organization_id', agentData.organization_id);

      if (teamsError) throw teamsError;

      setTeams(teamsData.map(team => ({
        ...team,
        agent_count: team.agent_count[0]?.count || 0
      })));
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      setProcessing(true);
      const supabase = createClientComponentClient();

      const { data, error } = await supabase
        .from('teams')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            organization_id: organizationId
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setTeams([...teams, { ...data, agent_count: 0 }]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam) return;

    try {
      setProcessing(true);
      const supabase = createClientComponentClient();

      const { data, error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('team_id', selectedTeam.team_id)
        .select()
        .single();

      if (error) throw error;

      setTeams(teams.map(team => 
        team.team_id === selectedTeam.team_id 
          ? { ...data, agent_count: team.agent_count }
          : team
      ));
      setShowEditModal(false);
      setSelectedTeam(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error updating team:', error);
      setError('Failed to update team');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      setProcessing(true);
      const supabase = createClientComponentClient();

      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('team_id', selectedTeam.team_id);

      if (error) throw error;

      setTeams(teams.filter(team => team.team_id !== selectedTeam.team_id));
      setShowDeleteModal(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Failed to delete team');
    } finally {
      setProcessing(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            Teams
          </h1>
          <p className="mt-2 text-base text-gray-600">
            Manage your organization's teams and their members
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Team
        </button>
      </div>

      {/* Empty state when no teams exist */}
      {teams.length === 0 && !loading && !error && (
        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No teams yet</h3>
          <p className="text-base text-gray-600 max-w-sm mx-auto">
            Get started by creating a new team for your organization.
          </p>
          <div className="mt-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Team
            </button>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.team_id}
              className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] hover:border-blue-200"
              onClick={() => {
                setSelectedTeam(team);
                setShowDetailsModal(true);
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{team.name}</h3>
                  </div>
                  <p className="text-base text-gray-600">{team.description || 'No description'}</p>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setFormData({
                        name: team.name,
                        description: team.description || ''
                      });
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center text-base text-gray-600">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">{team.agent_count}</span>
                  <span className="ml-1">{team.agent_count === 1 ? 'agent' : 'agents'}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Create New Team</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={processing || !formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2 inline-block" />
                      Create Team
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Edit Team</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTeam}
                  disabled={processing || !formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2 inline-block" />
                      Update Team
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/20 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Team</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-red-600">
                Are you sure you want to delete the team "{selectedTeam.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2 inline-block" />
                    Delete Team
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showDetailsModal && selectedTeam && (
        <TeamDetailsModal
          isOpen={showDetailsModal}
          team={selectedTeam}
          onClose={() => setShowDetailsModal(false)}
          onAgentRemoved={() => {
            setTeams(teams.map(t => 
              t.team_id === selectedTeam.team_id 
                ? { ...t, agent_count: t.agent_count - 1 }
                : t
            ));
          }}
        />
      )}
    </div>
  );
} 