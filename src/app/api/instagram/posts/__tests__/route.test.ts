import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InstagramCacheData } from "@/types/instagram";

const mockGetInstagramCache = vi.fn<() => Promise<InstagramCacheData | null>>();

vi.mock("@/lib/instagram-cache", () => ({
  getInstagramCache: () => mockGetInstagramCache(),
}));

import { GET } from "../route";

describe("GET /api/instagram/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached posts when cache exists", async () => {
    mockGetInstagramCache.mockResolvedValue({
      posts: [
        { id: "p-1", image: "/img.jpg", caption: "test", url: "https://ig" },
      ],
      lastUpdated: "2025-01-01T00:00:00.000Z",
      source: "api",
    });

    const request = new Request("http://localhost:3001/api/instagram/posts");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.posts).toEqual([
      { id: "p-1", image: "/img.jpg", caption: "test", url: "https://ig" },
    ]);
    expect(body.data.source).toBe("api");
  });

  it("returns mock posts when cache is empty", async () => {
    mockGetInstagramCache.mockResolvedValue(null);

    const request = new Request("http://localhost:3001/api/instagram/posts");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.source).toBe("mock");
    expect(Array.isArray(body.data.posts)).toBe(true);
  });

  it("returns mock posts when cache read fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetInstagramCache.mockRejectedValue(new Error("redis down"));

    const request = new Request("http://localhost:3001/api/instagram/posts");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.source).toBe("mock");
    expect(Array.isArray(body.data.posts)).toBe(true);
  });
});
