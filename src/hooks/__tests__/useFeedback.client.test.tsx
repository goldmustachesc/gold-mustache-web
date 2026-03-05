import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCreateFeedback,
  useAppointmentFeedback,
  useCreateGuestFeedback,
} from "../useFeedback";

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

let queryClient: QueryClient;

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const MOCK_FEEDBACK = {
  id: "fb-1",
  rating: 5,
  comment: "Excelente",
  appointmentId: "apt-1",
};

describe("useCreateFeedback", () => {
  it("calls POST /api/appointments/:id/feedback", async () => {
    stubFetch(MOCK_FEEDBACK);

    const { result } = renderHook(() => useCreateFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        appointmentId: "apt-1",
        rating: 5,
        comment: "Excelente",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/apt-1/feedback",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("invalidates appointment-feedback and client-appointments queries", async () => {
    stubFetch(MOCK_FEEDBACK);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1", rating: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["appointment-feedback", "apt-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["client-appointments"],
    });
  });
});

describe("useAppointmentFeedback", () => {
  it("does not fetch when appointmentId is undefined", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useAppointmentFeedback(undefined), {
      wrapper: createWrapper(),
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls GET /api/appointments/:id/feedback", async () => {
    stubFetch(MOCK_FEEDBACK);

    renderHook(() => useAppointmentFeedback("apt-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/appointments/apt-1/feedback",
        undefined,
      );
    });
  });
});

describe("useCreateGuestFeedback", () => {
  it("calls POST /api/appointments/guest/:id/feedback with guest token header", async () => {
    stubFetch(MOCK_FEEDBACK);

    const { result } = renderHook(() => useCreateGuestFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        input: { appointmentId: "apt-1", rating: 4 },
        accessToken: "guest-tkn-123",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/guest/apt-1/feedback",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Guest-Token": "guest-tkn-123",
        }),
      }),
    );
  });

  it("invalidates guest-appointments query on success", async () => {
    stubFetch(MOCK_FEEDBACK);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateGuestFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        input: { appointmentId: "apt-1", rating: 4 },
        accessToken: "tkn",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["guest-appointments"],
    });
  });
});
