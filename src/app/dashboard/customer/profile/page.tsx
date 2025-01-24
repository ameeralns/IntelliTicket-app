"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ProfileForm from '@/components/dashboard/customer/profile/ProfileForm';
import NotificationSettings from '@/components/dashboard/customer/profile/NotificationSettings';
import ContactPreferences from '@/components/dashboard/customer/profile/ContactPreferences';
import { notFound, useRouter } from 'next/navigation';

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string | null;
  notification_settings: {
    ticket_updates: boolean;
    marketing: boolean;
  } | null;
  contact_preferences: {
    email: boolean;
    phone: boolean;
  } | null;
}

export default function ProfilePage() {
  const [customerData, setCustomerData] = useState<any>(null);
  const supabase = createClientComponentClient();

  const loadCustomerData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) notFound();

    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', session.user.id)
      .single();

    if (!customer) notFound();
    setCustomerData(customer);
  };

  // Load customer data on mount
  useEffect(() => {
    loadCustomerData();
  }, []);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!customerData) return null;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Profile Settings</h1>
        
        <div className="space-y-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
            <ProfileForm
              initialData={{
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone || undefined,
              }}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <NotificationSettings
              initialSettings={customerData.notification_settings || {
                ticket_updates: true,
                marketing: false,
              }}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <ContactPreferences
              initialPreferences={customerData.contact_preferences || {
                email: true,
                phone: true,
              }}
            />
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Account Actions</h2>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 