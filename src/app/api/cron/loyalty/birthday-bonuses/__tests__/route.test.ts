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
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("executes the cron when authorized", async () => {
    vi.mocked(BirthdayService.creditBirthdayBonuses).mockResolvedValue({
      processedCount: 3,
      totalPointsCredited: 300,
      failedCount: 0,
    });

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.processedCount).toBe(3);
  });
});
