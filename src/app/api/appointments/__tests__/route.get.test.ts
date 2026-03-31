import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn();
const mockGetClientAppointments = vi.fn();
const mockGetBarberAppointments = vi.fn();
const mockBarberFindUnique = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockProfileCreate = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/services/booking", () => ({
  createAppointment: vi.fn(),
  getClientAppointments: (...args: unknown[]) =>
    mockGetClientAppointments(...args),
  getBarberAppointments: (...args: unknown[]) =>
    mockGetBarberAppointments(...args),
}));

vi.mock("@/services/notification", () => ({
  notifyAppointmentConfirmed: vi.fn(),
}));

vi.mock("@/services/barbershop-settings", () => ({
  getBarbershopSettings: vi.fn(),
}));

vi.mock("@/lib/booking-mode", () => ({
  resolveBookingMode: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    barber: {
      findUnique: (...args: unknown[]) => mockBarberFindUnique(...args),
    },
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      create: (...args: unknown[]) => mockProfileCreate(...args),
    },
  },
}));

import { GET } from "../route";

function createGetRequest(params = "") {
  return new Request(
    `http://localhost:3001/api/appointments${params ? `?${params}` : ""}`,
    { method: "GET" },
  );
}

describe("GET /api/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => ({ data: { user: null } }) },
    });

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 for invalid query params", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({ data: { user: { id: "user-1" } } }),
      },
    });

    const response = await GET(createGetRequest("barberId=bad-uuid"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns barber appointments when user is the barber", async () => {
    const barberId = "550e8400-e29b-41d4-a716-446655440000";
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    mockBarberFindUnique.mockResolvedValue({ id: barberId });
    mockGetBarberAppointments.mockResolvedValue([{ id: "apt-1" }]);

    const response = await GET(
      createGetRequest(
        `barberId=${barberId}&startDate=2026-03-01&endDate=2026-03-31`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: "apt-1" }]);
    expect(mockGetBarberAppointments).toHaveBeenCalled();
  });

  it("returns client appointments for existing profile", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({ data: { user: { id: "user-1" } } }),
      },
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ id: "profile-1", phone: null });
    mockGetClientAppointments.mockResolvedValue([{ id: "apt-2" }]);

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: "apt-2" }]);
  });

  it("creates profile when profile does not exist", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => ({
          data: {
            user: {
              id: "user-1",
              email: "test@example.com",
              user_metadata: { name: "João", phone: "11999999999" },
            },
          },
        }),
      },
    });
    mockBarberFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue(null);
    mockProfileCreate.mockResolvedValue({
      id: "profile-new",
      phone: "11999999999",
    });
    mockGetClientAppointments.mockResolvedValue([]);

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockProfileCreate).toHaveBeenCalled();
    expect(body.data).toEqual([]);
  });
});
