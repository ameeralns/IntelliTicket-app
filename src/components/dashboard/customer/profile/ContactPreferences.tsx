"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

interface ContactPreferences {
  email: boolean;
  phone: boolean;
}

interface ContactPreferencesProps {
  initialPreferences: ContactPreferences;
}

export default function ContactPreferences({ initialPreferences }: ContactPreferencesProps) {
  const [preferences, setPreferences] = useState<ContactPreferences>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleToggle = async (key: keyof ContactPreferences) => {
    setIsLoading(true);
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase
        .from('customers')
        .update({
          contact_preferences: newPreferences,
        })
        .eq('customer_id', session.user.id);

      if (error) throw error;
      setPreferences(newPreferences);
      toast.success('Contact preferences updated');
    } catch (error) {
      toast.error('Failed to update contact preferences');
      console.error('Error updating contact preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">Contact Preferences</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-200">Email Contact</h4>
            <p className="text-sm text-gray-400">
              Allow us to contact you via email
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleToggle('email')}
            className={`${
              preferences.email ? 'bg-indigo-600' : 'bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                preferences.email ? 'translate-x-5' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out mt-1`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-200">Phone Contact</h4>
            <p className="text-sm text-gray-400">
              Allow us to contact you via phone
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleToggle('phone')}
            className={`${
              preferences.phone ? 'bg-indigo-600' : 'bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                preferences.phone ? 'translate-x-5' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out mt-1`}
            />
          </button>
        </div>
      </div>
    </div>
  );
} 