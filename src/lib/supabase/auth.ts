import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Provider } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types';

export const supabase = createClientComponentClient<Database>();

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUpWithEmail(
  email: string, 
  password: string, 
  organizationCode: string,
  metadata: { 
    name: string
  }
) {
  const supabase = createClientComponentClient<Database>();

  console.log('Starting registration process...'); // Debug log
  console.log('Organization code received:', organizationCode); // Debug log

  // Try to find organization with matching code
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('organization_id, customer_code, agent_code')
    .or('customer_code.eq.' + organizationCode + ',agent_code.eq.' + organizationCode);

  console.log('Query result:', { organizations, orgError }); // Debug log

  if (orgError) {
    console.error('Organization lookup error:', orgError);
    return { data: null, error: orgError };
  }

  if (!organizations || organizations.length === 0) {
    console.log('No matching organization found for code:', organizationCode);
    return { data: null, error: new Error('Invalid organization code') };
  }

  const org = organizations[0];
  const role = org.customer_code === organizationCode ? 'customer' : 'agent';

  console.log('Found organization:', org);
  console.log('Determined role:', role);

  // Sign up user with determined role
  const { data: userData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        organization_id: org.organization_id,
        display_name: metadata.name,
        ...metadata
      }
    }
  });

  if (signUpError) {
    console.error('Signup error:', signUpError);
    return { data: null, error: signUpError };
  }

  // Create customer/agent record
  if (userData?.user) {
    if (role === 'customer') {
      // First check if customer already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email', email)
        .single();

      if (existingCustomer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            customer_id: userData.user.id,
            organization_id: org.organization_id,
            name: metadata.name,
            contact_preferences: { email: true, phone: true },
            notification_settings: { ticket_updates: true, marketing: false }
          })
          .eq('email', email);

        if (updateError) {
          console.error('Error updating customer record:', updateError);
          return { data: null, error: updateError };
        }
      } else {
        // Create new customer
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            customer_id: userData.user.id,
            organization_id: org.organization_id,
            name: metadata.name,
            email: email,
            contact_preferences: { email: true, phone: true },
            notification_settings: { ticket_updates: true, marketing: false }
          });

        if (customerError) {
          console.error('Error creating customer record:', customerError);
          return { data: null, error: customerError };
        }
      }
    } else {
      // First check if agent already exists
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('email', email)
        .single();

      if (existingAgent) {
        // Update existing agent
        const { error: updateError } = await supabase
          .from('agents')
          .update({
            agent_id: userData.user.id,
            organization_id: org.organization_id,
            name: metadata.name,
            role: 'support'
          })
          .eq('email', email);

        if (updateError) {
          console.error('Error updating agent record:', updateError);
          return { data: null, error: updateError };
        }
      } else {
        // Create new agent
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            agent_id: userData.user.id,
            organization_id: org.organization_id,
            name: metadata.name,
            email: email,
            role: 'support' // Default role for new agents
          });

        if (agentError) {
          console.error('Error creating agent record:', agentError);
          return { data: null, error: agentError };
        }
      }
    }
  }

  console.log('Registration successful:', userData);
  return { data: userData, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
} 