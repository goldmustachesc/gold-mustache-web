"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { NotificationBell } from "./NotificationBell";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationData } from "@/types/booking";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NotificationPanelProps {
  userId: string;
}

export function NotificationPanel({ userId }: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  // Show toast only for new realtime notifications (not existing ones on load)
  const handleNewNotification = useCallback(
    (notification: NotificationData) => {
      if (!openRef.current) {
        toast(notification.title, {
          description: notification.message,
        });
      }
    },
    [],
  );

  const { notifications, unreadCount, isLoading, markAsRead } =
    useNotifications({ userId, onNewNotification: handleNewNotification });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div>
          <NotificationBell
            unreadCount={unreadCount}
            onClick={() => setOpen(true)}
          />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Notificações</SheetTitle>
        </SheetHeader>
        <NotificationList
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          isLoading={isLoading}
        />
      </SheetContent>
    </Sheet>
  );
}
