"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NotificationBell } from "./NotificationBell";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "@/hooks/useNotifications";
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
  const { notifications, unreadCount, isLoading, markAsRead } =
    useNotifications({ userId });

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestUnread = notifications.find((n) => !n.read);
      if (latestUnread) {
        // Only show toast if panel is closed
        if (!open) {
          toast(latestUnread.title, {
            description: latestUnread.message,
          });
        }
      }
    }
  }, [notifications, open]);

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
