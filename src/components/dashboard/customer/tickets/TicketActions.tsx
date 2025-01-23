"use client";

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader2, RotateCw } from 'lucide-react';

interface TicketActionsProps {
  ticketId: string;
  currentStatus: string;
}

export default function TicketActions({ ticketId, currentStatus }: TicketActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    setActionInProgress(newStatus);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('ticket_id', ticketId);

      if (error) throw error;
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update ticket status');
      console.error('Error updating ticket status:', error);
    } finally {
      setIsLoading(false);
      setActionInProgress(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Actions</h2>
      
      <div className="space-y-4">
        {currentStatus !== 'Closed' && (
          <button
            onClick={() => handleStatusChange('Closed')}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {actionInProgress === 'Closed' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            Close Ticket
          </button>
        )}

        {currentStatus !== 'Resolved' && currentStatus !== 'Closed' && (
          <button
            onClick={() => handleStatusChange('Resolved')}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {actionInProgress === 'Resolved' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            Mark as Resolved
          </button>
        )}

        {(currentStatus === 'Resolved' || currentStatus === 'Closed') && (
          <button
            onClick={() => handleStatusChange('In Progress')}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {actionInProgress === 'In Progress' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RotateCw className="w-5 h-5 mr-2" />
            )}
            Reopen Ticket
          </button>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-200 mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
          >
            Print Ticket
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md"
            onClick={() => {
              const ticketContent = document.querySelector('.ticket-content');
              if (ticketContent) {
                navigator.clipboard.writeText(ticketContent.textContent || '');
                toast.success('Ticket content copied to clipboard');
              }
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
} 