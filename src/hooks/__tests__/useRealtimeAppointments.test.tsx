import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock Supabase client
const mockChannel = {
  on: vi.fn(),
  subscribe: vi.fn(),
};
mockChannel.on.mockReturnValue(mockChannel);
mockChannel.subscribe.mockReturnValue(mockChannel);

const mockSupabase = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { useRealtimeAppointments } from "../useRealtimeAppointments";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useRealtimeAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockSupabase.channel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not subscribe when barberId is null", () => {
    renderHook(() => useRealtimeAppointments(null), {
      wrapper: createWrapper(),
    });

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("subscribes to the correct channel when barberId is provided", () => {
    renderHook(() => useRealtimeAppointments("barber-1"), {
      wrapper: createWrapper(),
    });

    expect(mockSupabase.channel).toHaveBeenCalledWith(
      "barber-appointments:barber-1",
    );
  });

  it("subscribes to postgres_changes on appointments table with barber filter", () => {
    renderHook(() => useRealtimeAppointments("barber-1"), {
      wrapper: createWrapper(),
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: "barber_id=eq.barber-1",
      },
      expect.any(Function),
    );
  });

  it("calls subscribe on the channel", () => {
    renderHook(() => useRealtimeAppointments("barber-1"), {
      wrapper: createWrapper(),
    });

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("removes channel on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeAppointments("barber-1"), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("does not remove channel when barberId is null (no subscription made)", () => {
    const { unmount } = renderHook(() => useRealtimeAppointments(null), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(mockSupabase.removeChannel).not.toHaveBeenCalled();
  });

  it("invalidates appointments and dashboard queries on change", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useRealtimeAppointments("barber-1"), { wrapper });

    // Capture the handleChange callback passed to .on()
    const handleChange = mockChannel.on.mock.calls[0][2] as () => void;
    handleChange();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["appointments"],
      exact: false,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["dashboard"],
      exact: false,
    });
  });

  it("resubscribes when barberId changes", () => {
    const { rerender } = renderHook(
      ({ barberId }: { barberId: string | null }) =>
        useRealtimeAppointments(barberId),
      {
        wrapper: createWrapper(),
        initialProps: { barberId: "barber-1" },
      },
    );

    expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
    expect(mockSupabase.channel).toHaveBeenCalledWith(
      "barber-appointments:barber-1",
    );

    rerender({ barberId: "barber-2" });

    // Cleanup previous, subscribe new
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(mockSupabase.channel).toHaveBeenCalledWith(
      "barber-appointments:barber-2",
    );
  });

  it("uses channel name scoped to the specific barberId", () => {
    renderHook(() => useRealtimeAppointments("barber-xyz-456"), {
      wrapper: createWrapper(),
    });

    expect(mockSupabase.channel).toHaveBeenCalledWith(
      "barber-appointments:barber-xyz-456",
    );
  });
});
