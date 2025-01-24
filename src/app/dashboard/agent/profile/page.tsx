"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Mail, Phone, Building2, UserCircle, Key, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AgentProfile {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  organization: {
    name: string;
    customer_code: string;
    agent_code: string;
  };
}

interface AgentData {
  name: string;
  email: string;
  phone: string | null;
  role: string;
  organization: {
    name: string;
    customer_code: string;
    agent_code: string;
  };
}

export default function AgentProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClientComponentClient();
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Auth error:', userError);
          setError('Authentication error');
          setLoading(false);
          return;
        }
        
        if (!user) {
          router.push("/login");
          return;
        }

        console.log('Fetching data for user:', user.email);

        // First get the agent data
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select(`
            name,
            email,
            role,
            organization_id
          `)
          .eq("email", user.email)
          .single();

        if (agentError) {
          console.error('Agent data error:', agentError);
          setError('Failed to fetch agent data');
          setLoading(false);
          return;
        }

        if (!agentData) {
          setError('No agent data found');
          setLoading(false);
          return;
        }

        // Then get the organization data
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select(`
            name,
            system_settings (
              settings_key,
              settings_value
            )
          `)
          .eq("organization_id", agentData.organization_id)
          .single();

        if (orgError) {
          console.error('Organization data error:', orgError);
          setError('Failed to fetch organization data');
          setLoading(false);
          return;
        }

        // Get the customer and agent codes from system settings
        const customerCode = orgData.system_settings?.find(s => s.settings_key === 'customer_code')?.settings_value || 'N/A';
        const agentCode = orgData.system_settings?.find(s => s.settings_key === 'agent_code')?.settings_value || 'N/A';

        setProfile({
          name: agentData.name,
          email: agentData.email,
          phone: null, // Phone is not in the schema for agents
          role: agentData.role,
          organization: {
            name: orgData.name,
            customer_code: customerCode,
            agent_code: agentCode
          }
        });
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error loading profile</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-6 w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900">Profile not found</h1>
          <p className="text-gray-600 mt-2">Unable to load profile information</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-6 w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-20 transform rotate-45"></div>
          <div className="relative flex items-center space-x-6">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center backdrop-blur-sm ring-4 ring-white/20">
              <span className="text-4xl font-bold">{profile.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{profile.name}</h1>
              <p className="text-lg text-white/90 mt-2 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                {profile.role}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 h-full border border-indigo-100/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
                <UserCircle className="h-7 w-7 mr-3 text-indigo-600" />
                Personal Information
              </h2>
              <div className="grid gap-6">
                <div className="flex items-center space-x-4 p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Email</p>
                    <p className="text-base font-medium text-gray-900">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Phone</p>
                    <p className="text-base font-medium text-gray-900">{profile.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 h-full border border-indigo-100/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
                <Building2 className="h-7 w-7 mr-3 text-indigo-600" />
                Organization
              </h2>
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50">
                  <p className="text-sm font-medium text-indigo-600">Organization Name</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {profile.organization.name}
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50">
                  <p className="text-sm font-medium text-indigo-600">Customer Code</p>
                  <div className="mt-2 font-mono text-base bg-white/80 px-4 py-2 rounded-lg border border-indigo-100">
                    {profile.organization.customer_code}
                  </div>
                </div>
                <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50">
                  <p className="text-sm font-medium text-indigo-600">Agent Code</p>
                  <div className="mt-2 font-mono text-base bg-white/80 px-4 py-2 rounded-lg border border-indigo-100">
                    {profile.organization.agent_code}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="flex justify-center pt-6">
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center space-x-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500"
          >
            <LogOut className="h-6 w-6" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 