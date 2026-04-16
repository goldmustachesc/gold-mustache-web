import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/loyalty/birthday.service", () => ({
  BirthdayService: {
    creditBirthdayBonuses: vi.fn(),
  },
}));

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { BirthdayService } from "@/services/loyalty/birthday.service";
import { isFeatureEnabled } from "@/services/feature-flags";
import { GET, POST } from "../route";
import { makeRequest } from "../../__tests__/helpers";

const CRON_SECRET = "test-secret";

describe("POST /api/cron/loyalty/birthday-bonuses", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("calls creditBirthdayBonuses when authorized", async () => {
    vi.mocked(BirthdayService.creditBirthdayBonuses).mockResolvedValue({
      processedCount: 3,
      totalPointsCredited: 300,
      failedCount: 0,
    });

    const res = await POST(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(BirthdayService.creditBirthdayBonuses).toHaveBeenCalledOnce();
    expect(body.data.processedCount).toBe(3);
    expect(typeof body.data.durationMs).toBe("number");
  });

  it("does not invoke service when loyaltyProgram flag disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    const res = await POST(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.skipped).toBe(true);
    expect(BirthdayService.creditBirthdayBonuses).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthorized", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(BirthdayService.creditBirthdayBonuses).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/loyalty/birthday-bonuses", () => {
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
