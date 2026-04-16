import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from "@/services/feature-flags";
import { runLoyaltyCron } from "../_shared";
import { makeRequest } from "./helpers";

const CRON_SECRET = "test-secret";

describe("runLoyaltyCron", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when CRON_SECRET not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await runLoyaltyCron(
      makeRequest(CRON_SECRET),
      "expire-points",
      vi.fn(),
    );
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");
  });

  it("returns 401 when authorization header is invalid", async () => {
    const res = await runLoyaltyCron(
      makeRequest("wrong"),
      "expire-points",
      vi.fn(),
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 when authorization header is missing", async () => {
    const res = await runLoyaltyCron(makeRequest(), "expire-points", vi.fn());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns skipped when loyaltyProgram disabled", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    const job = vi.fn();
    const res = await runLoyaltyCron(
      makeRequest(CRON_SECRET),
      "expire-points",
      job,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.skipped).toBe(true);
    expect(body.data.reason).toBe("loyaltyProgram disabled");
    expect(job).not.toHaveBeenCalled();
  });

  it("invokes job and returns result with durationMs", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    const job = vi.fn().mockResolvedValue({ processedCount: 5 });
    const res = await runLoyaltyCron(
      makeRequest(CRON_SECRET),
      "expire-points",
      job,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.processedCount).toBe(5);
    expect(typeof body.data.durationMs).toBe("number");
    expect(job).toHaveBeenCalledOnce();
  });

  it("handles exception via handlePrismaError", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    const job = vi.fn().mockRejectedValue(new Error("DB fail"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await runLoyaltyCron(
      makeRequest(CRON_SECRET),
      "expire-points",
      job,
    );
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });
});
