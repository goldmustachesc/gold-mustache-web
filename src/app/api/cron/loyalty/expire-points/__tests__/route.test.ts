import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/loyalty/expiration.service", () => ({
  ExpirationService: {
    expirePoints: vi.fn(),
    notifyExpiringPoints: vi.fn(),
  },
}));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { ExpirationService } from "@/services/loyalty/expiration.service";
import { isFeatureEnabled } from "@/services/feature-flags";
import { GET, POST } from "../route";
import { makeRequest } from "../../__tests__/helpers";

const CRON_SECRET = "test-secret";

describe("POST /api/cron/loyalty/expire-points", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("calls expirePoints and notifyExpiringPoints when authorized", async () => {
    vi.mocked(ExpirationService.expirePoints).mockResolvedValue({
      processedCount: 2,
      totalPointsExpired: 100,
      affectedAccounts: 1,
    });
    vi.mocked(ExpirationService.notifyExpiringPoints).mockResolvedValue(
      undefined,
    );

    const res = await POST(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ExpirationService.expirePoints).toHaveBeenCalledOnce();
    expect(ExpirationService.notifyExpiringPoints).toHaveBeenCalledOnce();
    expect(body.data.processedCount).toBe(2);
    expect(typeof body.data.durationMs).toBe("number");
  });

  it("returns 401 when unauthorized", async () => {
    const res = await POST(makeRequest("bad-secret"));
    expect(res.status).toBe(401);
    expect(ExpirationService.expirePoints).not.toHaveBeenCalled();
  });

  it("returns 500 when expirePoints throws", async () => {
    vi.mocked(ExpirationService.expirePoints).mockRejectedValue(
      new Error("DB fail"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest(CRON_SECRET));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/cron/loyalty/expire-points", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 405 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET();
    expect(res.status).toBe(405);
  });

  it("returns usage info in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.message).toBeDefined();
  });
});
