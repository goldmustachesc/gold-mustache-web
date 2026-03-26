import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockMarkAppointmentAsCompleted = vi.fn();
const mockBarberFindUnique = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetUserRateLimitIdentifier = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/services/booking", () => ({
  markAppointmentAsCompleted: (...args: unknown[]) =>
    mockMarkAppointmentAsCompleted(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: (...args: unknown[]) => mockBarberFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getUserRateLimitIdentifier: (...args: unknown[]) =>
    mockGetUserRateLimitIdentifier(...args),
}));

import { PATCH } from "../complete/route";

function createRequest() {
  return new Request("http://localhost:3001/api/appointments/apt-1/complete", {
    method: "PATCH",
  });
}

describe("PATCH /api/appointments/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetUserRateLimitIdentifier.mockImplementation((userId: unknown) => {
      return `auth:${String(userId)}`;
    });
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 403 when user is not a barber", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("returns appointment when marking succeeds", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });
    mockMarkAppointmentAsCompleted.mockResolvedValue({ id: "apt-1" });

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "apt-1" });
    expect(mockMarkAppointmentAsCompleted).toHaveBeenCalledWith(
      "apt-1",
      "barber-1",
    );
    expect(mockCheckRateLimit).toHaveBeenCalledWith("api", "auth:user-1");
  });

  it("maps known service errors to HTTP codes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });

    mockMarkAppointmentAsCompleted.mockRejectedValue(
      new Error("APPOINTMENT_NOT_FOUND"),
    );

    const notFound = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notFound.status).toBe(404);

    mockMarkAppointmentAsCompleted.mockRejectedValue(
      new Error("APPOINTMENT_NOT_STARTED"),
    );

    const notStarted = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notStarted.status).toBe(412);

    mockMarkAppointmentAsCompleted.mockRejectedValue(
      new Error("APPOINTMENT_NOT_MARKABLE"),
    );

    const notMarkable = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(notMarkable.status).toBe(409);

    mockMarkAppointmentAsCompleted.mockRejectedValue(new Error("UNAUTHORIZED"));

    const unauthorized = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    expect(unauthorized.status).toBe(403);
  });

  it("returns 500 for unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockBarberFindUnique.mockResolvedValue({ id: "barber-1" });
    mockMarkAppointmentAsCompleted.mockRejectedValue(new Error("boom"));

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "apt-1" }),
    });

    expect(response.status).toBe(500);
  });
});
