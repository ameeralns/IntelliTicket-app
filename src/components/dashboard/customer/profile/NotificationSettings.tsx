"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

interface NotificationSettings {
  ticket_updates: boolean;
  marketing: boolean;
}

interface NotificationSettingsProps {
  initialSettings: NotificationSettings;
}

export default function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleToggle = async (key: keyof NotificationSettings) => {
    setIsLoading(true);
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase
        .from('customers')
        .update({
          notification_settings: newSettings,
        })
        .eq('customer_id', session.user.id);

      if (error) throw error;
      setSettings(newSettings);
      toast.success('Notification settings updated');
    } catch (error) {
      toast.error('Failed to update notification settings');
      console.error('Error updating notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">Notification Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-200">Ticket Updates</h4>
            <p className="text-sm text-gray-400">
              Receive notifications about your ticket status and updates
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleToggle('ticket_updates')}
            className={`${
              settings.ticket_updates ? 'bg-indigo-600' : 'bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.ticket_updates ? 'translate-x-5' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out mt-1`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-200">Marketing Updates</h4>
            <p className="text-sm text-gray-400">
              Receive news about new features and promotions
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleToggle('marketing')}
            className={`${
              settings.marketing ? 'bg-indigo-600' : 'bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                settings.marketing ? 'translate-x-5' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out mt-1`}
            />
          </button>
        </div>
      </div>
    </div>
  );
} 