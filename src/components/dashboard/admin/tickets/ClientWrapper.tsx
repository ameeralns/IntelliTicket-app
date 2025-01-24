'use client';

import dynamic from 'next/dynamic';

const TicketsContent = dynamic(
  () => import('./TicketsContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading tickets...</div>
      </div>
    ),
  }
);

export default function ClientWrapper() {
  return <TicketsContent />;
} 