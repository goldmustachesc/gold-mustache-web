"use client";

import type { NotificationData } from "@/types/booking";
import { Bell, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";

interface NotificationListProps {
  notifications: NotificationData[];
  onMarkAsRead: (id: string) => void;
  isLoading?: boolean;
}

const typeIcons: Record<string, typeof Bell> = {
  APPOINTMENT_CONFIRMED: Calendar,
  APPOINTMENT_CANCELLED: X,
  APPOINTMENT_REMINDER: Bell,
};

const typeColors: Record<string, string> = {
  APPOINTMENT_CONFIRMED: "text-success bg-success/10",
  APPOINTMENT_CANCELLED: "text-destructive bg-destructive/10",
  APPOINTMENT_REMINDER: "text-info bg-info/10",
};

export function NotificationList({
  notifications,
  onMarkAsRead,
  isLoading,
}: NotificationListProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return formatDateDdMmYyyyInSaoPaulo(date);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Nenhuma notificação</p>
      </div>
    );
  }

  return (
    <div className="divide-y max-h-[400px] overflow-y-auto">
      {notifications.map((notification) => {
        const Icon = typeIcons[notification.type] || Bell;
        const colorClass =
          typeColors[notification.type] || "text-gray-600 bg-gray-100";

        return (
          <button
            type="button"
            key={notification.id}
            onClick={() => !notification.read && onMarkAsRead(notification.id)}
            className={cn(
              "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
              !notification.read && "bg-primary/5",
            )}
          >
            <div className={cn("p-2 rounded-full", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn("text-sm", !notification.read && "font-medium")}
                >
                  {notification.title}
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(notification.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
