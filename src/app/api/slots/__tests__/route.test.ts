import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAvailableSlots = vi.fn();

vi.mock("@/services/booking", () => ({
  getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
}));

import { GET } from "../route";

describe("GET /api/slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 422 when query params are invalid", async () => {
    const request = new Request("http://localhost:3001/api/slots");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns slots when query params are valid", async () => {
    const slots = [{ time: "10:00", available: true }];
    mockGetAvailableSlots.mockResolvedValue(slots);

    const barberId = "b450f113-be42-4648-af5f-70893d137c19";
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetAvailableSlots).toHaveBeenCalledWith(
      expect.any(Date),
      barberId,
      serviceId,
    );
    expect(body.slots).toEqual(slots);
  });

  it("returns 500 when service throws", async () => {
    mockGetAvailableSlots.mockRejectedValue(new Error("boom"));

    const barberId = "b450f113-be42-4648-af5f-70893d137c19";
    const serviceId = "83ec4540-5bf9-4661-a133-97a6275eb303";

    const request = new Request(
      `http://localhost:3001/api/slots?date=2025-01-02&barberId=${barberId}&serviceId=${serviceId}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
