"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { Moon, Sun, Monitor, Layout, Type } from 'lucide-react';

interface ThemePreference {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
}

export default function AppearancePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<ThemePreference>({
    theme: 'dark',
    fontSize: 'medium',
    density: 'comfortable',
  });
  const supabase = createClientComponentClient();

  const handlePreferenceChange = async (key: keyof ThemePreference, value: string) => {
    setIsLoading(true);
    const newPreferences = {
      ...preferences,
      [key]: value,
    } as ThemePreference;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase
        .from('customers')
        .update({
          appearance_settings: newPreferences,
        })
        .eq('customer_id', session.user.id);

      if (error) throw error;
      setPreferences(newPreferences);
      toast.success('Appearance settings updated');
    } catch (error) {
      toast.error('Failed to update appearance settings');
      console.error('Error updating appearance settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Appearance Settings</h1>

        {/* Theme Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Monitor className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Theme</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handlePreferenceChange('theme', 'light')}
              className={`p-4 rounded-lg border-2 ${
                preferences.theme === 'light'
                  ? 'border-indigo-500 bg-gray-700'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              disabled={isLoading}
            >
              <Sun className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <span className="block text-sm text-gray-200">Light</span>
            </button>
            <button
              onClick={() => handlePreferenceChange('theme', 'dark')}
              className={`p-4 rounded-lg border-2 ${
                preferences.theme === 'dark'
                  ? 'border-indigo-500 bg-gray-700'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              disabled={isLoading}
            >
              <Moon className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <span className="block text-sm text-gray-200">Dark</span>
            </button>
            <button
              onClick={() => handlePreferenceChange('theme', 'system')}
              className={`p-4 rounded-lg border-2 ${
                preferences.theme === 'system'
                  ? 'border-indigo-500 bg-gray-700'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              disabled={isLoading}
            >
              <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <span className="block text-sm text-gray-200">System</span>
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Type className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Font Size</h2>
          </div>
          <div className="space-y-4">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => handlePreferenceChange('fontSize', size)}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  preferences.fontSize === size
                    ? 'bg-gray-700 border-l-4 border-indigo-500'
                    : 'hover:bg-gray-700'
                }`}
                disabled={isLoading}
              >
                <span className="text-white capitalize">{size}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <Layout className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Density</h2>
          </div>
          <div className="space-y-4">
            {['compact', 'comfortable', 'spacious'].map((density) => (
              <button
                key={density}
                onClick={() => handlePreferenceChange('density', density)}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  preferences.density === density
                    ? 'bg-gray-700 border-l-4 border-indigo-500'
                    : 'hover:bg-gray-700'
                }`}
                disabled={isLoading}
              >
                <span className="text-white capitalize">{density}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 