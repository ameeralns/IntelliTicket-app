import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Organization {
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchOrganization() {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get the organization from user metadata
        const organizationId = user.user_metadata.organization_id;
        if (!organizationId) {
          setIsLoading(false);
          return;
        }

        // Fetch organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('organization_id', organizationId)
          .single();

        if (orgError) {
          console.error('Error fetching organization:', orgError);
          setError(orgError.message);
          return;
        }

        if (org) {
          setOrganization(org);
          setError(null);
        } else {
          setError('No organization found');
        }
      } catch (error) {
        console.error('Error in useOrganization:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [supabase]);

  return { organization, isLoading, error };
} 