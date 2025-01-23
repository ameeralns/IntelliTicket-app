import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { User, Bell, Phone, Shield, Palette, Globe } from 'lucide-react';
import AccountManagement from '@/components/dashboard/customer/settings/AccountManagement';

export default async function SettingsPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) notFound();

  const settingsCategories = [
    {
      title: 'Profile Settings',
      description: 'Manage your personal information and contact details',
      icon: User,
      href: '/dashboard/customer/profile',
    },
    {
      title: 'Notification Preferences',
      description: 'Control how and when you receive updates',
      icon: Bell,
      href: '/dashboard/customer/profile#notifications',
    },
    {
      title: 'Contact Methods',
      description: 'Set up your preferred contact methods',
      icon: Phone,
      href: '/dashboard/customer/profile#contact',
    },
    {
      title: 'Security',
      description: 'Manage your password and security settings',
      icon: Shield,
      href: '/dashboard/customer/settings/security',
    },
    {
      title: 'Appearance',
      description: 'Customize your dashboard appearance',
      icon: Palette,
      href: '/dashboard/customer/settings/appearance',
    },
    {
      title: 'Language & Region',
      description: 'Set your preferred language and timezone',
      icon: Globe,
      href: '/dashboard/customer/settings/locale',
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.title}
                href={category.href}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-lg font-semibold text-white">
                      {category.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Account Management */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6">Account Management</h2>
          <AccountManagement />
        </div>
      </div>
    </div>
  );
} 