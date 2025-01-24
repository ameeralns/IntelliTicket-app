'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/auth-helpers-nextjs';
import { Loader2, Mail, Building2, UserCircle, Shield, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminProfile {
    name: string;
    email: string;
    role: string;
    organization_id: string;
    organizations: {
      name: string;
      customer_code: string;
      agent_code: string;
    };
  }

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClientComponentClient();
        
        // Get the current user's session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error('Failed to get user session');
        }

        if (!user) {
          throw new Error('No user found');
        }

        setUser(user);

        // Get the agent's details including organization
       const { data: agentData, error: agentError } = await supabase
  .from('agents')
  .select(`
    name,
    email,
    role,
    organization_id,
    organizations (
      name,
      customer_code,
      agent_code
    )
  `)
  .eq('email', user.email)
  .single<AdminProfile>();

        if (agentError) {
          throw new Error(`Error fetching agent: ${agentError.message}`);
        }

        if (!agentData) {
          throw new Error('No agent data found');
        }

        setProfile(agentData);
      } catch (error) {
        console.error('Error in profile fetch:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClientComponentClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">Error loading profile</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-sm rounded-lg">
        {/* Header */}
        <div className="px-6 py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-semibold text-primary">
                  {profile?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Admin Profile</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Personal Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <UserCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Full Name</p>
                    <p className="text-sm text-gray-900">{profile?.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email Address</p>
                    <p className="text-sm text-gray-900">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="text-sm text-gray-900 capitalize">{profile?.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Information */}
<div className="bg-gray-50 p-4 rounded-lg">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
  <div className="space-y-4">
    <div className="flex items-center space-x-3">
      <Building2 className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-500">Organization Name</p>
        <p className="text-sm text-gray-900">{profile?.organizations?.name}</p>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <UserCircle className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-500">Account ID</p>
        <p className="text-sm text-gray-900 font-mono">{user?.id}</p>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <Shield className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-500">Customer Code</p>
        <p className="text-sm text-gray-900 font-mono">{profile?.organizations?.customer_code}</p>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <Shield className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-medium text-gray-500">Agent Code</p>
        <p className="text-sm text-gray-900 font-mono">{profile?.organizations?.agent_code}</p>
      </div>
    </div>
  </div>
</div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Last Sign In</p>
                <p className="text-sm text-gray-900">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Account Created</p>
                <p className="text-sm text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 