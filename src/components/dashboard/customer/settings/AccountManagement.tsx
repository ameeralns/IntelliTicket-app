'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AccountManagement() {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/customer/export-data');
      if (!response.ok) throw new Error('Failed to export data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1].replace(/"/g, '') || 'customer-data.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Your data has been exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/customer/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      toast.success('Your account has been deleted successfully');
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="space-y-4">
        <button
          onClick={handleExportData}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <h3 className="text-white font-medium">Download Your Data</h3>
          <p className="text-sm text-gray-400">
            Get a copy of your personal data and ticket history
          </p>
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <h3 className="text-red-500 font-medium">
            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
          </h3>
          <p className="text-sm text-gray-400">
            Permanently delete your account and all associated data
          </p>
        </button>
      </div>
    </div>
  );
} 