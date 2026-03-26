import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockAppointmentFindUnique = vi.fn();
const mockNotifyAppointmentReminder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: (...args: unknown[]) => mockAppointmentFindUnique(...args),
    },
  },
}));

vi.mock("@/services/notification", () => ({
  notifyAppointmentReminder: (...args: unknown[]) =>
    mockNotifyAppointmentReminder(...args),
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyFromIsoDateLike: vi.fn().mockReturnValue("10/03/2026"),
}));

import { POST } from "../reminder/route";

function createRequest() {
  return new Request("http://localhost:3001/api/appointments/apt-1/reminder", {
    method: "POST",
  });
}

const routeParams = { params: Promise.resolve({ id: "apt-1" }) };

describe("POST /api/appointments/[id]/reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 404 when appointment not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the barber of the appointment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { userId: "other-user", name: "João" },
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("returns 400 when appointment is not CONFIRMED", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { userId: "user-1", name: "João" },
      status: "CANCELLED_BY_CLIENT",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_STATUS");
  });

  it("sends notification and returns whatsapp link for registered client with phone", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { id: "barber-1", userId: "user-1", name: "João" },
      service: { name: "Corte" },
      client: {
        id: "client-1",
        userId: "client-user-1",
        fullName: "Carlos Silva",
        phone: "11999999999",
      },
      guestClient: null,
      date: new Date("2026-03-10T00:00:00Z"),
      startTime: "09:00",
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.type).toBe("notification_and_whatsapp");
    expect(body.data.whatsappUrl).toContain("wa.me");
    expect(mockNotifyAppointmentReminder).toHaveBeenCalledWith(
      "client-user-1",
      expect.objectContaining({ serviceName: "Corte" }),
    );
  });

  it("sends notification-only for registered client without phone", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { id: "barber-1", userId: "user-1", name: "João" },
      service: { name: "Corte" },
      client: {
        id: "client-1",
        userId: "client-user-1",
        fullName: "Carlos Silva",
        phone: null,
      },
      guestClient: null,
      date: new Date("2026-03-10T00:00:00Z"),
      startTime: "09:00",
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.type).toBe("notification");
  });

  it("returns whatsapp link for guest client", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { id: "barber-1", userId: "user-1", name: "João" },
      service: { name: "Corte" },
      client: null,
      guestClient: {
        id: "guest-1",
        fullName: "Pedro Lima",
        phone: "11888888888",
      },
      date: new Date("2026-03-10T00:00:00Z"),
      startTime: "09:00",
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.type).toBe("whatsapp");
    expect(body.data.whatsappUrl).toContain("wa.me");
  });

  it("returns 400 when no contact available", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAppointmentFindUnique.mockResolvedValue({
      barber: { id: "barber-1", userId: "user-1", name: "João" },
      service: { name: "Corte" },
      client: null,
      guestClient: null,
      date: new Date("2026-03-10T00:00:00Z"),
      startTime: "09:00",
      status: "CONFIRMED",
    });

    const response = await POST(createRequest(), routeParams);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("NO_CONTACT");
  });
});
