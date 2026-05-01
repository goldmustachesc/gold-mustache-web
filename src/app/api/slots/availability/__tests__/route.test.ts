import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDateAvailabilityRange = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockGetUser = vi.fn();
const mockCookieList: Array<{ name: string; value: string }> = [];

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => mockCookieList,
    }),
}));

vi.mock("@/services/booking", () => ({
  getDateAvailabilityRange: (...args: unknown[]) =>
    mockGetDateAvailabilityRange(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

import { GET } from "../route";

const BARBER_ID = "b450f113-be42-4648-af5f-70893d137c19";
const SERVICE_ID = "83ec4540-5bf9-4661-a133-97a6275eb303";

describe("GET /api/slots/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieList.length = 0;
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    mockGetClientIdentifier.mockReturnValue("127.0.0.1");
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 422 when query params are missing", async () => {
    const request = new Request("http://localhost:3001/api/slots/availability");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when barberId is missing", async () => {
    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=2025-06-11&to=2025-07-11`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when from date format is invalid", async () => {
    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=11-06-2025&to=2025-07-11&barberId=${BARBER_ID}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns unavailableDates when query is valid with serviceId", async () => {
    mockGetDateAvailabilityRange.mockResolvedValue({
      unavailableDates: ["2025-06-15", "2025-06-22"],
    });

    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=2025-06-11&to=2025-07-11&barberId=${BARBER_ID}&serviceId=${SERVICE_ID}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDateAvailabilityRange).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      BARBER_ID,
      SERVICE_ID,
      expect.objectContaining({ clientId: undefined }),
    );
    expect(body.data.unavailableDates).toEqual(["2025-06-15", "2025-06-22"]);
  });

  it("returns unavailableDates when query is valid without serviceId", async () => {
    mockGetDateAvailabilityRange.mockResolvedValue({
      unavailableDates: [],
    });

    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=2025-06-11&to=2025-07-11&barberId=${BARBER_ID}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetDateAvailabilityRange).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      BARBER_ID,
      null,
      expect.objectContaining({ clientId: undefined }),
    );
    expect(body.data.unavailableDates).toEqual([]);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=2025-06-11&to=2025-07-11&barberId=${BARBER_ID}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe("RATE_LIMITED");
  });

  it("returns 500 when service throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDateAvailabilityRange.mockRejectedValue(new Error("boom"));

    const request = new Request(
      `http://localhost:3001/api/slots/availability?from=2025-06-11&to=2025-07-11&barberId=${BARBER_ID}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
