"use client";

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bell } from 'lucide-react';

interface NotificationIndicatorProps {
  ticketId: string;
}

export default function NotificationIndicator({ ticketId }: NotificationIndicatorProps) {
  const [hasUnread, setHasUnread] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial check for unread notifications
    checkUnreadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_notifications',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          setHasUnread(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const checkUnreadNotifications = async () => {
    const { data } = await supabase
      .from('ticket_notifications')
      .select('notification_id')
      .eq('ticket_id', ticketId)
      .eq('is_read', false)
      .limit(1);

    setHasUnread(Boolean(data && data.length > 0));
  };

  if (!hasUnread) return null;

  return (
    <div className="absolute top-2 right-2">
      <div className="relative">
        <Bell className="h-5 w-5 text-blue-500 animate-pulse" />
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
      </div>
    </div>
  );
} 