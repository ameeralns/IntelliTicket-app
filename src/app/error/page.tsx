'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { message: string };
}) {
  const router = useRouter();
  const message = searchParams.message || 'An error occurred';

  async function handleSignOut() {
    await fetch('/api/auth/signout', {
      method: 'POST',
    });
    router.push('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Error</h1>
      <p className="text-red-500 mb-8">{message}</p>
      <Button onClick={handleSignOut}>Sign Out and Try Again</Button>
    </div>
  );
} 