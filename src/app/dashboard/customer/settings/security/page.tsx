"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { Lock, Shield, Key } from 'lucide-react';

export default function SecurityPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const supabase = createClientComponentClient();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to update password');
      console.error('Error updating password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Security Settings</h1>

        {/* Password Change Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <Lock className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-200">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-200">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-200">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Security Recommendations */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-6 h-6 text-indigo-500 mr-3" />
            <h2 className="text-xl font-semibold text-white">Security Recommendations</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start">
              <Key className="w-5 h-5 text-indigo-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-white font-medium">Use a Strong Password</h3>
                <p className="text-sm text-gray-400">
                  Your password should be at least 8 characters long and include a mix of letters, numbers, and special characters.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-indigo-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-white font-medium">Enable Two-Factor Authentication</h3>
                <p className="text-sm text-gray-400">
                  Add an extra layer of security to your account by enabling 2FA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 