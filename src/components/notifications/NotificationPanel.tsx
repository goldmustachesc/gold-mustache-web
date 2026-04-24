"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { NotificationList } from "./NotificationList";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationData } from "@/types/booking";
import { Button } from "@/components/ui/button";
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

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications({ userId, onNewNotification: handleNewNotification });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch {
      toast.error("Erro ao marcar notificações como lidas");
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
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2.5">
              <SheetTitle className="text-lg font-semibold tracking-tight">
                Notificações
              </SheetTitle>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold tabular-nums">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
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
