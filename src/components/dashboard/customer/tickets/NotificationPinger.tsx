'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bell } from 'lucide-react';

interface NotificationPingerProps {
  ticketId: string;
}

export default function NotificationPinger({ ticketId }: NotificationPingerProps) {
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

  const markAsRead = async () => {
    if (!hasUnread) return;

    await supabase
      .from('ticket_notifications')
      .update({ is_read: true })
      .eq('ticket_id', ticketId);

    setHasUnread(false);
  };

  if (!hasUnread) return null;

  return (
    <div 
      className="relative inline-flex cursor-pointer"
      onClick={markAsRead}
      title="New activity in this ticket"
    >
      <Bell className="w-4 h-4 text-blue-400" />
      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
    </div>
  );
} 