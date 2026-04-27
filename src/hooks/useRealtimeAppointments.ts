"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to Supabase Realtime changes on the `appointments` table
 * for a specific barber, invalidating React Query cache on any change
 * so the dashboard updates automatically without full page refresh.
 */
export function useRealtimeAppointments(barberId: string | null) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!barberId || !supabase) return;

    let channel: RealtimeChannel | null = null;

    const handleChange = () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
        exact: false,
      });
    };

    channel = supabase
      .channel(`barber-appointments:${barberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${barberId}`,
        },
        handleChange,
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [barberId, supabase, queryClient]);
}
