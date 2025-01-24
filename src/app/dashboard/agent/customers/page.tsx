import { Metadata } from 'next';
import CustomersClient from './customers-client';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Management | IntelliTicket',
  description: 'Manage and view customer information, tickets, and interactions.',
};

export default async function CustomersPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
              Customers
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and interact with your assigned customers
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Gradient Separator */}
        <div className="h-px bg-gradient-to-r from-blue-100 via-blue-500 to-blue-100 dark:from-blue-900 dark:via-blue-500 dark:to-blue-900" />
      </div>

      <div className="h-full">
        <CustomersClient />
      </div>
    </div>
  );
} 