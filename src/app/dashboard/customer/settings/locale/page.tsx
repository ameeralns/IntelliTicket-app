"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { Globe, Clock } from 'lucide-react';

interface LocalePreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export default function LocalePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<LocalePreferences>({
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  });
  const supabase = createClientComponentClient();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
  ];

  const dateFormats = [
    { value: 'MM/DD/YYYY', label: '12/31/2023' },
    { value: 'DD/MM/YYYY', label: '31/12/2023' },
    { value: 'YYYY-MM-DD', label: '2023-12-31' },
  ];

  const handlePreferenceChange = async (key: keyof LocalePreferences, value: string) => {
    setIsLoading(true);
    const newPreferences = {
      ...preferences,
      [key]: value,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase
        .from('customers')
        .update({
          locale_settings: newPreferences,
        })
        .eq('customer_id', session.user.id);

      if (error) throw error;
      setPreferences(newPreferences);
      toast.success('Locale settings updated');
    } catch (error) {
      toast.error('Failed to update locale settings');
      console.error('Error updating locale settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Language & Region</h1>

        {/* Language Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Globe className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Language</h2>
          </div>
          <div className="space-y-4">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handlePreferenceChange('language', language.code)}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  preferences.language === language.code
                    ? 'bg-gray-700 border-l-4 border-indigo-500'
                    : 'hover:bg-gray-700'
                }`}
                disabled={isLoading}
              >
                <span className="text-white">{language.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timezone Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Clock className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Time Zone</h2>
          </div>
          <select
            value={preferences.timezone}
            onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
            className="w-full bg-gray-700 border-gray-600 rounded-lg text-white py-2 px-3"
            disabled={isLoading}
          >
            {Intl.supportedValuesOf('timeZone').map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Date Format</h2>
          <div className="space-y-4">
            {dateFormats.map((format) => (
              <button
                key={format.value}
                onClick={() => handlePreferenceChange('dateFormat', format.value)}
                className={`w-full text-left px-4 py-3 rounded-lg ${
                  preferences.dateFormat === format.value
                    ? 'bg-gray-700 border-l-4 border-indigo-500'
                    : 'hover:bg-gray-700'
                }`}
                disabled={isLoading}
              >
                <span className="text-white">{format.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Format */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Time Format</h2>
          <div className="space-y-4">
            <button
              onClick={() => handlePreferenceChange('timeFormat', '12h')}
              className={`w-full text-left px-4 py-3 rounded-lg ${
                preferences.timeFormat === '12h'
                  ? 'bg-gray-700 border-l-4 border-indigo-500'
                  : 'hover:bg-gray-700'
              }`}
              disabled={isLoading}
            >
              <span className="text-white">12-hour (1:30 PM)</span>
            </button>
            <button
              onClick={() => handlePreferenceChange('timeFormat', '24h')}
              className={`w-full text-left px-4 py-3 rounded-lg ${
                preferences.timeFormat === '24h'
                  ? 'bg-gray-700 border-l-4 border-indigo-500'
                  : 'hover:bg-gray-700'
              }`}
              disabled={isLoading}
            >
              <span className="text-white">24-hour (13:30)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 