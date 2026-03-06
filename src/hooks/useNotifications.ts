"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationData } from "@/types/booking";
import type { PaginationMeta } from "@/types/api";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { apiGet } from "@/lib/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface NotificationsResponse {
  notifications: NotificationData[];
  unreadCount: number;
  meta: PaginationMeta;
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

function notificationsQueryKey(
  userId: string | null,
  page: number,
  limit: number,
) {
  return ["notifications", userId, page, limit] as const;
}

export function useNotifications({
  userId,
  page = 1,
  limit = 20,
  onNewNotification,
}: UseNotificationsOptions): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const pageRef = useRef(page);
  pageRef.current = page;

  const supabase = useMemo(() => createClient(), []);

  const queryKey = useMemo(
    () => notificationsQueryKey(userId, page, limit),
    [userId, page, limit],
  );

  const {
    data,
    isLoading,
    error,
    refetch: rqRefetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      return apiGet<NotificationsResponse>(`/api/notifications?${params}`);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const meta = data?.meta ?? null;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const result = await markNotificationAsReadAction(notificationId);
        if (!result.success) {
          console.error("Failed to mark notification as read:", result.error);
          return;
        }

        queryClient.setQueryData(
          queryKey,
          (old: NotificationsResponse | undefined) => {
            if (!old) return old;
            let decremented = false;
            const updated = old.notifications.map((n) => {
              if (n.id === notificationId && !n.read) {
                decremented = true;
                return { ...n, read: true };
              }
              return n;
            });
            return {
              ...old,
              notifications: updated,
              unreadCount: decremented
                ? Math.max(0, old.unreadCount - 1)
                : old.unreadCount,
            };
          },
        );
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    [queryClient, queryKey],
  );

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

      queryClient.setQueryData(
        queryKey,
        (old: NotificationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          };
        },
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [userId, queryClient, queryKey]);

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

            queryClient.setQueryData(
              queryKey,
              (old: NotificationsResponse | undefined) => {
                if (!old) return old;
                return {
                  ...old,
                  notifications:
                    pageRef.current === 1
                      ? [newNotification, ...old.notifications]
                      : old.notifications,
                  unreadCount: newNotification.read
                    ? old.unreadCount
                    : old.unreadCount + 1,
                };
              },
            );
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
  }, [userId, supabase, onNewNotification, queryClient, queryKey]);

  const refetch = useCallback(async () => {
    await rqRefetch();
  }, [rqRefetch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error as Error | null,
    meta,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
