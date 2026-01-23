import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetServices = vi.fn();

vi.mock("@/services/booking", () => ({
  getServices: (...args: unknown[]) => mockGetServices(...args),
}));

import { GET } from "../route";

describe("GET /api/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns services and forwards barberId", async () => {
    const services = [{ id: "s-1", name: "Corte" }];
    mockGetServices.mockResolvedValue(services);

    const request = new Request(
      "http://localhost:3001/api/services?barberId=barber-1",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetServices).toHaveBeenCalledWith("barber-1");
    expect(body.services).toEqual(services);
  });

  it("returns 500 on service failure", async () => {
    mockGetServices.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost:3001/api/services");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
