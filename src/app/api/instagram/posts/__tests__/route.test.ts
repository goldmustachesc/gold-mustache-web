import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadFile = vi.fn();

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    default: {
      ...actual,
      readFile: (...args: unknown[]) => mockReadFile(...args),
    },
    readFile: (...args: unknown[]) => mockReadFile(...args),
  };
});

import { GET } from "../route";

describe("GET /api/instagram/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached posts when cache exists", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        posts: [{ id: "p-1" }],
        lastUpdated: "2025-01-01T00:00:00.000Z",
        source: "cache",
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toEqual([{ id: "p-1" }]);
    expect(body.source).toBe("cache");
  });

  it("returns mock posts when cache is empty", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ posts: [], lastUpdated: null, source: "cache" }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("mock");
    expect(Array.isArray(body.posts)).toBe(true);
  });

  it("returns mock posts when cache read fails", async () => {
    mockReadFile.mockRejectedValue(new Error("boom"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("mock");
    expect(Array.isArray(body.posts)).toBe(true);
  });
});
