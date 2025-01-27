import { Metadata } from 'next';
import AddOrganizationForm from './AddOrganizationForm';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Add Organization - IntelliTicket',
  description: 'Register your organization with IntelliTicket',
};

export default function AddOrganizationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold">IT</span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-white via-primary to-violet-300 bg-clip-text text-transparent">
                IntelliTicket
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-32">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Register Your Organization</h1>
          <p className="text-slate-400 mb-8">
            Get started with IntelliTicket by registering your organization. Fill out the form below to create your organization account.
          </p>
          <div className="p-8 bg-slate-900/50 rounded-lg border border-slate-800">
            <AddOrganizationForm />
          </div>
        </div>
      </div>
    </div>
  );
} 