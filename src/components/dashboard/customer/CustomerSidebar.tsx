'use client';

import Link from 'next/link';
import { Home, Ticket, Plus, BookOpen, Settings, HelpCircle } from 'lucide-react';

interface CustomerSidebarProps {
  customerData: {
    name: string;
    email: string;
    customer_id: string;
  } | null;
}

export default function CustomerSidebar({ customerData }: CustomerSidebarProps) {
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard/customer' },
    { icon: Ticket, label: 'My Tickets', href: '/dashboard/customer/tickets' },
    { icon: Plus, label: 'New Ticket', href: '/dashboard/customer/tickets/new' },
    { icon: BookOpen, label: 'Knowledge Base', href: '/dashboard/customer/knowledge' },
    { icon: Settings, label: 'Settings', href: '/dashboard/customer/settings' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/customer/help' },
  ];

  return (
    <div className="w-64 bg-gray-800 text-white p-6">
      {/* User Info */}
      <div className="mb-8">
        <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center text-xl mb-4">
          {customerData?.name?.charAt(0) || 'U'}
        </div>
        <h3 className="font-semibold text-lg">{customerData?.name || 'User'}</h3>
        <p className="text-sm text-gray-400">{customerData?.email || ''}</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
} 