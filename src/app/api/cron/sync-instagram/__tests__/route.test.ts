import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockFetchInstagramPosts = vi.fn();
const mockValidateInstagramConfig = vi.fn();
const mockSetInstagramCache = vi.fn();
const mockIsRedisConfigured = vi.fn();

vi.mock("@/services/instagram", () => ({
  fetchInstagramPosts: (...args: unknown[]) => mockFetchInstagramPosts(...args),
  validateInstagramConfig: (...args: unknown[]) =>
    mockValidateInstagramConfig(...args),
}));

vi.mock("@/lib/instagram-cache", () => ({
  setInstagramCache: (...args: unknown[]) => mockSetInstagramCache(...args),
}));

vi.mock("@/lib/redis", () => ({
  isRedisConfigured: (...args: unknown[]) => mockIsRedisConfigured(...args),
}));

vi.mock("@/config/api", () => ({
  API_CONFIG: {
    instagram: {
      maxRetries: 3,
      postsLimit: 10,
      retryBaseDelayMs: 0,
    },
  },
}));

import { POST, GET } from "../route";

const CRON_SECRET = "test-cron-secret";

const mockPosts = [
  { id: "1", caption: "Post 1", media_url: "https://example.com/1.jpg" },
  { id: "2", caption: "Post 2", media_url: "https://example.com/2.jpg" },
];

function createRequest(secret?: string): Request {
  return {
    headers: {
      get: (name: string) => {
        if (name === "authorization" && secret) return `Bearer ${secret}`;
        return null;
      },
    },
  } as unknown as Request;
}

function validInstagramConfig() {
  mockValidateInstagramConfig.mockReturnValue({
    isValid: true,
    accessToken: "ig-access-token",
    userId: "ig-user-id",
  });
}

describe("POST /api/cron/sync-instagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 500 when CRON_SECRET env is not set", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");
  });

  it("returns 401 when authorization header is wrong", async () => {
    const response = await POST(createRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns 500 when Instagram config is invalid", async () => {
    mockValidateInstagramConfig.mockReturnValue({
      isValid: false,
      error: "Missing access token",
    });

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");
    expect(body.message).toContain("Missing access token");
  });

  it("fetches posts, saves to cache, and returns success", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue(mockPosts);
    mockIsRedisConfigured.mockReturnValue(true);
    mockSetInstagramCache.mockResolvedValue(undefined);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.postsCount).toBe(2);
    expect(body.data.message).toContain("sincronizados com sucesso");
    expect(body.data.lastUpdated).toBeDefined();
    expect(mockSetInstagramCache).toHaveBeenCalledWith({
      posts: mockPosts,
      lastUpdated: expect.any(String),
      source: "api",
    });
  });

  it("calls fetchInstagramPosts with correct params from config", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue(mockPosts);
    mockIsRedisConfigured.mockReturnValue(true);
    mockSetInstagramCache.mockResolvedValue(undefined);

    await POST(createRequest(CRON_SECRET));

    expect(mockFetchInstagramPosts).toHaveBeenCalledWith(
      "ig-access-token",
      "ig-user-id",
      10,
    );
  });

  it("returns postsCount 0 when no posts found", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue([]);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.postsCount).toBe(0);
    expect(body.data.warning).toContain("Nenhum post");
    expect(mockSetInstagramCache).not.toHaveBeenCalled();
  });

  it("returns 500 when Redis is not configured", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue(mockPosts);
    mockIsRedisConfigured.mockReturnValue(false);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("CONFIG_ERROR");
    expect(body.message).toContain("Redis");
    expect(mockSetInstagramCache).not.toHaveBeenCalled();
  });

  it("retries on fetch failure and succeeds", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts
      .mockRejectedValueOnce(new Error("Temporary API error"))
      .mockResolvedValueOnce(mockPosts);
    mockIsRedisConfigured.mockReturnValue(true);
    mockSetInstagramCache.mockResolvedValue(undefined);

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.postsCount).toBe(2);
    expect(mockFetchInstagramPosts).toHaveBeenCalledTimes(2);
  });

  it("returns SYNC_ERROR after exhausting all retries", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockRejectedValue(
      new Error("API permanently down"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("SYNC_ERROR");
    expect(mockFetchInstagramPosts).toHaveBeenCalledTimes(3);
  });

  it("returns SYNC_ERROR when setInstagramCache fails", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue(mockPosts);
    mockIsRedisConfigured.mockReturnValue(true);
    mockSetInstagramCache.mockRejectedValue(new Error("Cache write failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("SYNC_ERROR");
  });
});

describe("GET /api/cron/sync-instagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when authorization header is missing", async () => {
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("executes the sync flow when authorized", async () => {
    validInstagramConfig();
    mockFetchInstagramPosts.mockResolvedValue(mockPosts);
    mockIsRedisConfigured.mockReturnValue(true);
    mockSetInstagramCache.mockResolvedValue(undefined);

    const response = await GET(createRequest(CRON_SECRET));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.postsCount).toBe(2);
    expect(mockFetchInstagramPosts).toHaveBeenCalledOnce();
  });
});
