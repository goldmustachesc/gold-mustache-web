"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationData } from "@/types/booking";
import type { PaginationMeta } from "@/types/api";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { apiGet } from "@/lib/api/client";
import {
  markNotificationAsRead as markNotificationAsReadAction,
  markAllNotificationsAsRead as markAllNotificationsAsReadAction,
} from "@/actions/notifications";

interface UseNotificationsOptions {
  userId: string | null;
  page?: number;
  limit?: number;
  onNewNotification?: (notification: NotificationData) => void;
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  meta: PaginationMeta | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications({
  userId,
  page = 1,
  limit = 20,
  onNewNotification,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const pageRef = useRef(page);
  pageRef.current = page;

  const supabase = useMemo(() => createClient(), []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const data = await apiGet<{
        notifications: NotificationData[];
        unreadCount: number;
        meta: PaginationMeta;
      }>(`/api/notifications?${params}`);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setMeta(data.meta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [userId, page, limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await markNotificationAsReadAction(notificationId);
      if (!result.success) {
        console.error("Failed to mark notification as read:", result.error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => {
          if (n.id === notificationId && !n.read) {
            setUnreadCount((c) => Math.max(0, c - 1));
            return { ...n, read: true };
          }
          return n;
        }),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await markAllNotificationsAsReadAction();
      if (!result.success) {
        console.error(
          "Failed to mark all notifications as read:",
          result.error,
        );
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !supabase) return;

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

            if (pageRef.current === 1) {
              setNotifications((prev) => [newNotification, ...prev]);
            }
            if (!newNotification.read) {
              setUnreadCount((c) => c + 1);
            }
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

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    meta,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
