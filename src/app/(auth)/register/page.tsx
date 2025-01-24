'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/supabase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const metadata = {
        name,
      };

      const { data, error } = await signUpWithEmail(email, password, organizationCode, metadata);
      if (error) throw error;

      // Get the role from the signup response
      const role = data?.user?.user_metadata?.role;
      if (!role) throw new Error('Role not assigned');

      // Redirect to the appropriate dashboard
      router.push(`/dashboard/${role}`);
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Link>

        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">IT</span>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-white via-primary to-violet-300 bg-clip-text text-transparent">
              IntelliTicket
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
          <p className="text-slate-400 mb-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/90 font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700 text-white"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationCode" className="text-slate-200">Organization Code</Label>
              <Input
                id="organizationCode"
                type="text"
                value={organizationCode}
                onChange={(e) => setOrganizationCode(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                placeholder="Enter your organization code"
              />
              <p className="text-sm text-slate-400">
                Enter the organization code provided to you
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
              size="lg"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 