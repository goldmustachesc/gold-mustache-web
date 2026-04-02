import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useBarberAbsences,
  useCreateBarberAbsence,
  useDeleteBarberAbsence,
} from "../useBarberAbsences";

function stubFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    }),
  );
}

function stubFetchMessage() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: "Done" }),
    }),
  );
}

function stubFetchError(code: string, message: string, status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: code, message }),
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

const MOCK_ABSENCE = {
  id: "a-1",
  date: "2026-03-15",
  startTime: null,
  endTime: null,
  reason: "Consulta médica",
};

describe("useBarberAbsences", () => {
  it("calls GET /api/barbers/me/absences with date range params", async () => {
    stubFetch([MOCK_ABSENCE]);

    renderHook(() => useBarberAbsences("2026-03-01", "2026-03-31"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("startDate=2026-03-01"),
        undefined,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("endDate=2026-03-31"),
        undefined,
      );
    });
  });

  it("works without date params", async () => {
    stubFetch([MOCK_ABSENCE]);

    renderHook(() => useBarberAbsences(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/barbers/me/absences", undefined);
    });
  });

  it("keeps previous absences while fetching a new date range", async () => {
    let resolveSecondFetch: (() => void) | undefined;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [MOCK_ABSENCE] }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondFetch = () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      data: [
                        { ...MOCK_ABSENCE, id: "a-2", date: "2026-04-12" },
                      ],
                    }),
                });
            }),
        ),
    );

    const { result, rerender } = renderHook(
      ({ startDate, endDate }: { startDate: string; endDate: string }) =>
        useBarberAbsences(startDate, endDate),
      {
        wrapper: createWrapper(),
        initialProps: {
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_ABSENCE]);

    rerender({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(result.current.data).toEqual([MOCK_ABSENCE]);

    resolveSecondFetch?.();

    await waitFor(() => {
      expect(result.current.data).toEqual([
        { ...MOCK_ABSENCE, id: "a-2", date: "2026-04-12" },
      ]);
    });
  });
});

describe("useCreateBarberAbsence", () => {
  it("calls POST /api/barbers/me/absences", async () => {
    stubFetch(MOCK_ABSENCE);

    const { result } = renderHook(() => useCreateBarberAbsence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-03-15", reason: "Médico" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/absences",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("translates ABSENCE_CONFLICT error", async () => {
    stubFetchError(
      "ABSENCE_CONFLICT",
      "Já existe uma ausência para esta data",
      409,
    );

    const { result } = renderHook(() => useCreateBarberAbsence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-03-15" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "Já existe uma ausência para esta data",
    );
  });

  it("invalidates absences and slots queries on success", async () => {
    stubFetch(MOCK_ABSENCE);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateBarberAbsence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-03-15" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["barber-absences"],
      exact: false,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});

describe("useDeleteBarberAbsence", () => {
  it("calls DELETE /api/barbers/me/absences/:id", async () => {
    stubFetchMessage();

    const { result } = renderHook(() => useDeleteBarberAbsence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("a-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/barbers/me/absences/a-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("invalidates absences and slots queries on success", async () => {
    stubFetchMessage();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteBarberAbsence(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate("a-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["barber-absences"],
      exact: false,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["slots"],
      exact: false,
    });
  });
});
