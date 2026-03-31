import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckRateLimit = vi.fn();
const mockGetClientIdentifier = vi.fn();
const mockGuestClientFindUnique = vi.fn();
const mockAppointmentFindUnique = vi.fn();
const mockGetAppointmentFeedback = vi.fn();
const mockCreateGuestFeedback = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (...args: unknown[]) => mockGetClientIdentifier(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guestClient: {
      findUnique: (...args: unknown[]) => mockGuestClientFindUnique(...args),
    },
    appointment: {
      findUnique: (...args: unknown[]) => mockAppointmentFindUnique(...args),
    },
  },
}));

vi.mock("@/services/feedback", () => ({
  getAppointmentFeedback: (...args: unknown[]) =>
    mockGetAppointmentFeedback(...args),
  createGuestFeedback: (...args: unknown[]) => mockCreateGuestFeedback(...args),
}));

import { GET, POST } from "../feedback/route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function createGetRequest(id: string, guestToken?: string) {
  const headers: Record<string, string> = {};
  if (guestToken) headers["x-guest-token"] = guestToken;
  return new Request(
    `http://localhost:3001/api/appointments/guest/${id}/feedback`,
    { method: "GET", headers },
  ) as unknown as import("next/server").NextRequest;
}

function createPostRequest(id: string, body: unknown, guestToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (guestToken) headers["x-guest-token"] = guestToken;
  return new Request(
    `http://localhost:3001/api/appointments/guest/${id}/feedback`,
    { method: "POST", headers, body: JSON.stringify(body) },
  ) as unknown as import("next/server").NextRequest;
}

describe("GET /api/appointments/guest/[id]/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("ip");
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 1000,
    });

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(429);
  });

  it("returns 400 for invalid appointment ID", async () => {
    const response = await GET(createGetRequest("bad-id", "token"), {
      params: Promise.resolve({ id: "bad-id" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 401 when guest token is missing", async () => {
    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when guest client not found", async () => {
    mockGuestClientFindUnique.mockResolvedValue(null);

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 when guest token was already consumed", async () => {
    mockGuestClientFindUnique.mockResolvedValue({
      id: "guest-1",
      accessTokenConsumedAt: new Date("2026-03-30T10:00:00.000Z"),
    });

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("GUEST_TOKEN_CONSUMED");
  });

  it("returns 404 when appointment not found", async () => {
    mockGuestClientFindUnique.mockResolvedValue({ id: "guest-1" });
    mockAppointmentFindUnique.mockResolvedValue(null);

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when guest does not own appointment", async () => {
    mockGuestClientFindUnique.mockResolvedValue({ id: "guest-1" });
    mockAppointmentFindUnique.mockResolvedValue({
      id: VALID_UUID,
      guestClientId: "other-guest",
    });

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(403);
  });

  it("returns feedback on success", async () => {
    mockGuestClientFindUnique.mockResolvedValue({ id: "guest-1" });
    mockAppointmentFindUnique.mockResolvedValue({
      id: VALID_UUID,
      guestClientId: "guest-1",
    });
    mockGetAppointmentFeedback.mockResolvedValue({ rating: 4 });

    const response = await GET(createGetRequest(VALID_UUID, "token"), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.rating).toBe(4);
  });
});

describe("POST /api/appointments/guest/[id]/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIdentifier.mockReturnValue("ip");
    mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9 });
  });

  it("returns 401 when guest token is missing", async () => {
    const response = await POST(createPostRequest(VALID_UUID, { rating: 5 }), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    const response = await POST(
      createPostRequest(VALID_UUID, { rating: 0 }, "token"),
      { params: Promise.resolve({ id: VALID_UUID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("creates feedback on success", async () => {
    mockCreateGuestFeedback.mockResolvedValue({ id: "fb-1", rating: 5 });

    const response = await POST(
      createPostRequest(VALID_UUID, { rating: 5, comment: "Top" }, "token"),
      { params: Promise.resolve({ id: VALID_UUID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("fb-1");
    expect(mockCreateGuestFeedback).toHaveBeenCalledWith(
      { appointmentId: VALID_UUID, rating: 5, comment: "Top" },
      "token",
    );
  });

  it("maps GUEST_TOKEN_CONSUMED domain error", async () => {
    mockCreateGuestFeedback.mockRejectedValue(
      new Error("GUEST_TOKEN_CONSUMED"),
    );

    const response = await POST(
      createPostRequest(VALID_UUID, { rating: 5 }, "token"),
      { params: Promise.resolve({ id: VALID_UUID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("GUEST_TOKEN_CONSUMED");
  });

  it("maps FEEDBACK_ALREADY_EXISTS domain error", async () => {
    mockCreateGuestFeedback.mockRejectedValue(
      new Error("FEEDBACK_ALREADY_EXISTS"),
    );

    const response = await POST(
      createPostRequest(VALID_UUID, { rating: 5 }, "token"),
      { params: Promise.resolve({ id: VALID_UUID }) },
    );

    expect(response.status).toBe(409);
  });
});
