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
  team: TeamWithAgentCount;
  onClose: () => void;
  onAgentRemoved: () => void;
}

function TeamDetailsModal({ team, onClose, onAgentRemoved }: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTeamAgents();
  }, [team.team_id]);

  const fetchTeamAgents = async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();

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

  const handleRemoveAgent = async (agentId: string) => {
    try {
      setProcessing(true);
      const supabase = createClientComponentClient();

      const { error } = await supabase
        .from('agents')
        .update({ team_id: null })
        .eq('agent_id', agentId);

      if (error) throw error;

      setAgents(agents.filter(agent => agent.agent_id !== agentId));
      onAgentRemoved();
    } catch (error) {
      console.error('Error removing agent:', error);
      setError('Failed to remove team member');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{team.description || 'No description'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <span className="text-sm text-gray-500">{agents.length} members</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500">{error}</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.email}</p>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {agent.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAgent(agent.agent_id)}
                    disabled={processing}
                    className="text-gray-400 hover:text-red-600 disabled:opacity-50"
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

        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <p>Created</p>
              <p className="text-gray-900">{new Date(team.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p>Last Updated</p>
              <p className="text-gray-900">{new Date(team.updated_at).toLocaleString()}</p>
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Teams</h1>
          <p className="mt-2 text-base text-gray-600">
            Manage your organization's teams
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-8 py-4 text-lg font-bold text-gray-900 bg-white hover:bg-gray-50 rounded-xl shadow-xl hover:shadow-2xl transform transition-all duration-200 hover:scale-105 active:scale-95 ring-2 ring-primary border border-primary"
        >
          <Plus className="h-6 w-6 mr-2 text-primary" />
          Create New Team
        </button>
      </div>

      {/* Empty state when no teams exist */}
      {teams.length === 0 && !loading && !error && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-xl font-semibold text-gray-900">No teams yet</h3>
          <p className="mt-2 text-base text-gray-600">Get started by creating a new team for your organization.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedTeam(team);
                setShowDetailsModal(true);
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                  <p className="mt-2 text-base text-gray-600">{team.description || 'No description'}</p>
                </div>
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setFormData({
                        name: team.name,
                        description: team.description || ''
                      });
                      setShowEditModal(true);
                    }}
                    className="text-gray-500 hover:text-primary"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      setShowDeleteModal(true);
                    }}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center text-base text-gray-600">
                <Users className="h-5 w-5 mr-2" />
                {team.agent_count} {team.agent_count === 1 ? 'agent' : 'agents'}
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Created {new Date(team.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Team</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={processing || !formData.name}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Team</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTeam}
                  disabled={processing || !formData.name}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Pencil className="h-4 w-4 mr-2" />
                  )}
                  Update Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Delete Team</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the team "{selectedTeam.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={processing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Details Modal */}
      {showDetailsModal && selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setShowDetailsModal(false)}
          onAgentRemoved={() => {
            // Update the agent count in the teams list
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