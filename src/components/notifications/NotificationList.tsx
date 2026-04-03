"use client";

import type { NotificationData } from "@/types/booking";
import {
  Bell,
  Calendar,
  X,
  Star,
  TrendingUp,
  Clock,
  Gift,
  Users,
  Cake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";

interface NotificationListProps {
  notifications: NotificationData[];
  onMarkAsRead: (id: string) => void;
  isLoading?: boolean;
}

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string; iconColor: string }
> = {
  APPOINTMENT_CONFIRMED: {
    icon: Calendar,
    color: "bg-success/10",
    iconColor: "text-success",
  },
  APPOINTMENT_CANCELLED: {
    icon: X,
    color: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  APPOINTMENT_REMINDER: {
    icon: Bell,
    color: "bg-info/10",
    iconColor: "text-info",
  },
  LOYALTY_POINTS_EARNED: {
    icon: Star,
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
  LOYALTY_TIER_UPGRADE: {
    icon: TrendingUp,
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
  LOYALTY_POINTS_EXPIRING: {
    icon: Clock,
    color: "bg-warning/15",
    iconColor: "text-warning",
  },
  LOYALTY_REWARD_REDEEMED: {
    icon: Gift,
    color: "bg-success/10",
    iconColor: "text-success",
  },
  LOYALTY_REFERRAL_BONUS: {
    icon: Users,
    color: "bg-info/10",
    iconColor: "text-info",
  },
  LOYALTY_BIRTHDAY_BONUS: {
    icon: Cake,
    color: "bg-primary/10",
    iconColor: "text-primary",
  },
};

const defaultConfig = {
  icon: Bell,
  color: "bg-muted",
  iconColor: "text-muted-foreground",
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
      <div className="px-5 py-4 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3.5 p-3.5 rounded-lg animate-pulse">
            <div className="w-9 h-9 bg-muted rounded-lg shrink-0" />
            <div className="flex-1 space-y-2.5 py-0.5">
              <div className="h-3.5 bg-muted rounded-md w-2/3" />
              <div className="h-3 bg-muted/70 rounded-md w-5/6" />
            </div>
            <div className="h-3 bg-muted/50 rounded-md w-8 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
          <Bell className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          Nenhuma notificação
        </p>
        <p className="text-xs text-muted-foreground/60 text-center">
          Quando houver novidades sobre seus agendamentos, elas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2">
      <div className="space-y-0.5">
        {notifications.map((notification) => {
          const config = typeConfig[notification.type] ?? defaultConfig;
          const Icon = config.icon;

          return (
            <button
              type="button"
              key={notification.id}
              onClick={() =>
                !notification.read && onMarkAsRead(notification.id)
              }
              className={cn(
                "w-full flex items-start gap-3 p-3.5 text-left rounded-lg transition-all duration-150",
                "hover:bg-muted/50 active:scale-[0.995]",
                !notification.read && "bg-primary/[0.04]",
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  config.color,
                )}
              >
                <Icon className={cn("h-4 w-4", config.iconColor)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-[13px] leading-tight",
                      !notification.read
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/80",
                    )}
                  >
                    {notification.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums pt-px">
                    {formatTime(notification.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] leading-snug text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </div>

              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
