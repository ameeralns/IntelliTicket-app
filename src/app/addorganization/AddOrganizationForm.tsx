'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Create the regular client for auth operations
const supabase = createClientComponentClient();

// Create the service role client for database operations
const serviceRoleClient = createClientComponentClient({
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
});

export default function AddOrganizationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationDescription: '',
    firstName: '',
    lastName: '',
    adminEmail: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // 1. Sign up the admin user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user?.id) throw new Error('No user ID returned from auth signup');

      // 2. Create the organization
      const { data: orgData, error: orgError } = await serviceRoleClient
        .from('organizations')
        .insert({
          name: formData.organizationName,
          description: formData.organizationDescription
        })
        .select('organization_id')
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('No organization data returned');

      // 3. Create the admin agent
      const { error: agentError } = await serviceRoleClient
        .from('agents')
        .insert({
          agent_id: authData.user.id,
          organization_id: orgData.organization_id,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.adminEmail,
          role: 'admin'
        });

      if (agentError) {
        // Rollback organization creation
        await serviceRoleClient
          .from('organizations')
          .delete()
          .eq('organization_id', orgData.organization_id);
        throw agentError;
      }

      // 4. Create default system settings
      const defaultSettings = [
        {
          organization_id: orgData.organization_id,
          settings_key: 'default_priority',
          settings_value: 'Medium'
        },
        {
          organization_id: orgData.organization_id,
          settings_key: 'working_hours',
          settings_value: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
            workdays: [1, 2, 3, 4, 5]
          }
        },
        {
          organization_id: orgData.organization_id,
          settings_key: 'sla_settings',
          settings_value: {
            low: 48,
            medium: 24,
            high: 8,
            urgent: 4
          }
        }
      ];

      const { error: settingsError } = await serviceRoleClient
        .from('system_settings')
        .insert(defaultSettings);

      if (settingsError) {
        console.warn('Settings creation error:', settingsError);
        // Non-critical error, continue
      }

      // 5. Update auth user with organization_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: { organization_id: orgData.organization_id }
      });

      if (updateError) {
        console.warn('Update user error:', updateError);
        // Non-critical error, continue
      }

      // 6. Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.adminEmail,
        password: formData.password,
      });

      if (signInError) {
        toast.error('Organization created but sign-in failed. Please try signing in manually.');
        router.push('/login');
        return;
      }

      toast.success('Organization created successfully!');
      router.push('/dashboard/admin');
      router.refresh();

    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'An error occurred during organization creation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name</Label>
        <Input
          id="organizationName"
          required
          maxLength={100}
          value={formData.organizationName}
          onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
          placeholder="Enter your organization name"
          className="bg-slate-900/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationDescription">Organization Description</Label>
        <Textarea
          id="organizationDescription"
          value={formData.organizationDescription}
          onChange={(e) => setFormData({ ...formData, organizationDescription: e.target.value })}
          placeholder="Describe your organization"
          className="bg-slate-900/50"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            required
            maxLength={50}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Enter your first name"
            className="bg-slate-900/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            required
            maxLength={50}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Enter your last name"
            className="bg-slate-900/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          type="email"
          required
          maxLength={100}
          value={formData.adminEmail}
          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
          placeholder="Enter admin email address"
          className="bg-slate-900/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Create a password (minimum 8 characters)"
          className="bg-slate-900/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Confirm your password"
          className="bg-slate-900/50"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90"
        disabled={loading}
      >
        {loading ? 'Creating Organization...' : 'Create Organization'}
      </Button>
    </form>
  );
} 