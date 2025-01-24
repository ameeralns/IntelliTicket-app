'use client';

import * as React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { UserPlus, UserMinus } from 'lucide-react';

interface TicketContextMenuProps {
  children: React.ReactNode;
  isAssigned: boolean;
  onAssign: () => void;
}

export default function TicketContextMenu({
  children,
  isAssigned,
  onAssign,
}: TicketContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onAssign} className="gap-2">
          {isAssigned ? (
            <>
              <UserMinus className="w-4 h-4" />
              <span>Reassign Ticket</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Assign Ticket</span>
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
} 