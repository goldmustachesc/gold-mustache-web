"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationData } from "@/types/booking";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseNotificationsOptions {
  userId: string | null;
  onNewNotification?: (notification: NotificationData) => void;
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications({
  userId,
  onNewNotification,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  // This ensures the realtime subscription remains stable
  const supabase = useMemo(() => createClient(), []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/notifications?userId=${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await fetch(`/api/notifications/mark-all-read`, {
        method: "PATCH",
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [userId]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification: NotificationData = {
              id: payload.new.id,
              userId: payload.new.user_id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              data: payload.new.data,
              read: payload.new.read,
              createdAt: payload.new.created_at,
            };

            setNotifications((prev) => [newNotification, ...prev]);
            onNewNotification?.(newNotification);
          },
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, supabase, onNewNotification]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
