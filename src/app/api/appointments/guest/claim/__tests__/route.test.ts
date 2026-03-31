import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockProfileCreate = vi.fn();
const mockClaimGuestAppointmentsToProfile = vi.fn();
const mockRequireValidOrigin = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      create: (...args: unknown[]) => mockProfileCreate(...args),
    },
  },
}));

vi.mock("@/services/guest-linking", () => ({
  claimGuestAppointmentsToProfile: (...args: unknown[]) =>
    mockClaimGuestAppointmentsToProfile(...args),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: (...args: unknown[]) => mockRequireValidOrigin(...args),
}));

import { POST } from "../route";

function createRequest(headers?: HeadersInit) {
  return new Request("http://localhost:3001/api/appointments/guest/claim", {
    method: "POST",
    headers,
  });
}

describe("POST /api/appointments/guest/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireValidOrigin.mockReturnValue(null);
  });

  it("returns 401 when guest token is missing", async () => {
    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("MISSING_TOKEN");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({ data: { user: null } }),
      },
    });

    const response = await POST(
      createRequest({ "X-Guest-Token": "guest-token-1" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("creates a profile when missing and claims guest appointments", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({
          data: {
            user: {
              id: "user-1",
              email: "cliente@test.com",
              user_metadata: { name: "Cliente Teste", phone: "11999998888" },
            },
          },
        }),
      },
    });
    mockProfileFindUnique.mockResolvedValue(null);
    mockProfileCreate.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      phone: "11999998888",
    });
    mockClaimGuestAppointmentsToProfile.mockResolvedValue({
      linked: true,
      appointmentsTransferred: 2,
      guestClientClaimed: true,
      banMigrated: true,
      alreadyClaimed: false,
    });

    const response = await POST(
      createRequest({ "X-Guest-Token": "guest-token-1" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockProfileCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        fullName: "Cliente Teste",
        phone: "11999998888",
      },
    });
    expect(mockClaimGuestAppointmentsToProfile).toHaveBeenCalledWith({
      profileId: "profile-1",
      guestToken: "guest-token-1",
    });
    expect(body.data.appointmentsTransferred).toBe(2);
  });

  it("returns 409 when token belongs to another claimed profile", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({
          data: {
            user: {
              id: "user-1",
              email: "cliente@test.com",
              user_metadata: {},
            },
          },
        }),
      },
    });
    mockProfileFindUnique.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
    });
    mockClaimGuestAppointmentsToProfile.mockRejectedValue(
      new Error("GUEST_ALREADY_CLAIMED"),
    );

    const response = await POST(
      createRequest({ "X-Guest-Token": "guest-token-1" }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("GUEST_ALREADY_CLAIMED");
  });
});
