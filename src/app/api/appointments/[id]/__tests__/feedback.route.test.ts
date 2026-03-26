import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockAppointmentFindUnique = vi.fn();
const mockGetAppointmentFeedback = vi.fn();
const mockCreateFeedback = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
    },
    appointment: {
      findUnique: (...args: unknown[]) => mockAppointmentFindUnique(...args),
    },
  },
}));

vi.mock("@/services/feedback", () => ({
  getAppointmentFeedback: (...args: unknown[]) =>
    mockGetAppointmentFeedback(...args),
  createFeedback: (...args: unknown[]) => mockCreateFeedback(...args),
}));

import { GET, POST } from "../feedback/route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

function createGetRequest(id: string) {
  return new Request(`http://localhost:3001/api/appointments/${id}/feedback`, {
    method: "GET",
  }) as unknown as import("next/server").NextRequest;
}

function createPostRequest(id: string, body: unknown) {
  return new Request(`http://localhost:3001/api/appointments/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("GET /api/appointments/[id]/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid appointment ID", async () => {
    const response = await GET(createGetRequest("bad-id"), {
      params: Promise.resolve({ id: "bad-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_APPOINTMENT_ID");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when profile not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue(null);

    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("PROFILE_NOT_FOUND");
  });

  it("returns 404 when appointment not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockAppointmentFindUnique.mockResolvedValue(null);

    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("APPOINTMENT_NOT_FOUND");
  });

  it("returns 403 when user does not own the appointment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockAppointmentFindUnique.mockResolvedValue({
      id: VALID_UUID,
      clientId: "other-profile",
    });

    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(403);
  });

  it("returns feedback on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockAppointmentFindUnique.mockResolvedValue({
      id: VALID_UUID,
      clientId: "profile-1",
    });
    mockGetAppointmentFeedback.mockResolvedValue({
      rating: 5,
      comment: "Great",
    });

    const response = await GET(createGetRequest(VALID_UUID), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.rating).toBe(5);
  });
});

describe("POST /api/appointments/[id]/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid appointment ID", async () => {
    const response = await POST(createPostRequest("bad-id", { rating: 5 }), {
      params: Promise.resolve({ id: "bad-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_APPOINTMENT_ID");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createPostRequest(VALID_UUID, { rating: 5 }), {
      params: Promise.resolve({ id: VALID_UUID }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    const response = await POST(createPostRequest(VALID_UUID, { rating: 0 }), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("creates feedback on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockCreateFeedback.mockResolvedValue({ id: "fb-1", rating: 5 });

    const response = await POST(
      createPostRequest(VALID_UUID, { rating: 5, comment: "Great" }),
      { params: Promise.resolve({ id: VALID_UUID }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("fb-1");
  });

  it("maps FEEDBACK_ALREADY_EXISTS domain error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1" });
    mockCreateFeedback.mockRejectedValue(new Error("FEEDBACK_ALREADY_EXISTS"));

    const response = await POST(createPostRequest(VALID_UUID, { rating: 5 }), {
      params: Promise.resolve({ id: VALID_UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("FEEDBACK_ALREADY_EXISTS");
  });
});
