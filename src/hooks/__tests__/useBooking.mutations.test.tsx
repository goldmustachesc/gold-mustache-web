import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useCreateAppointment,
  useCreateGuestAppointment,
  useCancelAppointment,
  useCancelAppointmentByBarber,
  useMarkNoShow,
  useMarkCompleted,
  useCreateAppointmentByBarber,
  useCancelGuestAppointment,
} from "../useBooking";

const mockSetGuestToken = vi.fn();
const mockGetGuestToken = vi.fn();

vi.mock("@/lib/guest-session", () => ({
  getGuestToken: (...args: unknown[]) => mockGetGuestToken(...args),
  setGuestToken: (...args: unknown[]) => mockSetGuestToken(...args),
}));

function stubFetchSuccess(data: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchError(error: string, status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error, message: error }),
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

describe("useCreateAppointment", () => {
  it("calls POST /api/appointments and invalidates queries on success", async () => {
    stubFetchSuccess({ id: "apt-1" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        serviceId: "s-1",
        barberId: "b-1",
        date: "2026-03-10",
        startTime: "09:00",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["appointments"] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["slots"] }),
    );
  });

  it("translates SLOT_OCCUPIED ApiError", async () => {
    stubFetchError("SLOT_OCCUPIED", 409);

    const { result } = renderHook(() => useCreateAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        serviceId: "s-1",
        barberId: "b-1",
        date: "2026-03-10",
        startTime: "09:00",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("já foi reservado");
  });
});

describe("useCreateGuestAppointment", () => {
  it("stores guest token on success", async () => {
    stubFetchSuccess({ appointment: { id: "apt-g1" }, accessToken: "tkn-1" });

    const { result } = renderHook(() => useCreateGuestAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        serviceId: "s-1",
        barberId: "b-1",
        date: "2026-03-10",
        startTime: "09:00",
        clientName: "João",
        clientPhone: "11999999999",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetGuestToken).toHaveBeenCalledWith("tkn-1");
  });
});

describe("useCancelAppointment", () => {
  it("calls PATCH cancel and invalidates queries", async () => {
    stubFetchSuccess({ id: "apt-1", status: "CANCELLED_BY_CLIENT" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCancelAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["cancelled-appointments"] }),
    );
  });

  it("translates APPOINTMENT_IN_PAST error", async () => {
    stubFetchError("APPOINTMENT_IN_PAST", 400);

    const { result } = renderHook(() => useCancelAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("já passou");
  });
});

describe("useCancelAppointmentByBarber", () => {
  it("calls PATCH cancel with reason", async () => {
    stubFetchSuccess({ id: "apt-1" });

    const { result } = renderHook(() => useCancelAppointmentByBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1", reason: "Indisponível" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/apt-1/cancel",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("useMarkNoShow", () => {
  it("calls PATCH no-show endpoint", async () => {
    stubFetchSuccess({ id: "apt-1", status: "NO_SHOW" });

    const { result } = renderHook(() => useMarkNoShow(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/apt-1/no-show",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("translates PRECONDITION_FAILED error", async () => {
    stubFetchError("PRECONDITION_FAILED", 412);

    const { result } = renderHook(() => useMarkNoShow(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("após o horário");
  });
});

describe("useMarkCompleted", () => {
  it("calls PATCH complete endpoint", async () => {
    stubFetchSuccess({ id: "apt-1", status: "COMPLETED" });

    const { result } = renderHook(() => useMarkCompleted(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/apt-1/complete",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("translates PRECONDITION_FAILED error", async () => {
    stubFetchError("PRECONDITION_FAILED", 412);

    const { result } = renderHook(() => useMarkCompleted(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("após o horário");
  });
});

describe("useCreateAppointmentByBarber", () => {
  it("calls POST barbers/me/appointments and invalidates dashboard", async () => {
    stubFetchSuccess({ id: "apt-1" });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateAppointmentByBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        serviceId: "s-1",
        date: "2026-03-10",
        startTime: "09:00",
        clientName: "João",
        clientPhone: "11999999999",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/appointments",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["dashboard"] }),
    );
  });

  it("translates BARBER_UNAVAILABLE with barber-specific message", async () => {
    stubFetchError("BARBER_UNAVAILABLE", 400);

    const { result } = renderHook(() => useCreateAppointmentByBarber(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        serviceId: "s-1",
        date: "2026-03-10",
        startTime: "09:00",
        clientName: "João",
        clientPhone: "11999999999",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Você não atende");
  });
});

describe("useCancelGuestAppointment", () => {
  it("throws when no guest token available", async () => {
    mockGetGuestToken.mockReturnValue(null);

    const { result } = renderHook(() => useCancelGuestAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-g1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Sessão expirada");
  });

  it("cancels guest appointment with token header", async () => {
    mockGetGuestToken.mockReturnValue("guest-token-123");
    stubFetchSuccess({ id: "apt-g1", status: "CANCELLED_BY_CLIENT" });

    const { result } = renderHook(() => useCancelGuestAppointment(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ appointmentId: "apt-g1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/appointments/guest/apt-g1/cancel",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          "X-Guest-Token": "guest-token-123",
        }),
      }),
    );
  });
});
