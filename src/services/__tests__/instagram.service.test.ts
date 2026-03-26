import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchInstagramPosts,
  getInstagramUserId,
  validateInstagramConfig,
} from "../instagram";

type MockFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

function mockFetchResponse(
  resp: Partial<MockFetchResponse>,
): MockFetchResponse {
  return {
    ok: resp.ok ?? true,
    status: resp.status ?? 200,
    statusText: resp.statusText ?? "OK",
    json: resp.json ?? (async () => ({})),
  };
}

describe("services/instagram (fetch/env mocked unit tests)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("getInstagramUserId returns id on success", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: true,
        json: async () => ({ id: "ig-1", username: "x" }),
      }) as unknown as Response,
    );

    await expect(getInstagramUserId("token")).resolves.toBe("ig-1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me?fields=id,username&access_token=token"),
      { next: { revalidate: 86400 } },
    );
  });

  it("getInstagramUserId throws a helpful error on non-2xx", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "nope" } }),
      }) as unknown as Response,
    );

    await expect(getInstagramUserId("token")).rejects.toThrow(
      "Instagram API error: nope",
    );
  });

  it("fetchInstagramPosts filters only IMAGE/CAROUSEL_ALBUM and maps fields", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "1",
              caption: "c1",
              media_type: "IMAGE",
              media_url: "img1",
              permalink: "p1",
              timestamp: "t1",
              thumbnail_url: null,
            },
            {
              id: "2",
              caption: null,
              media_type: "VIDEO",
              media_url: "vid",
              permalink: "p2",
              timestamp: "t2",
              thumbnail_url: "thumb",
            },
            {
              id: "3",
              caption: "c3",
              media_type: "CAROUSEL_ALBUM",
              media_url: "img3",
              permalink: "p3",
              timestamp: "t3",
              thumbnail_url: null,
            },
          ],
        }),
      }) as unknown as Response,
    );

    const posts = await fetchInstagramPosts("token", "user", 10);
    expect(posts).toEqual([
      {
        id: "1",
        image: "img1",
        caption: "c1",
        url: "p1",
        timestamp: "t1",
        mediaType: "IMAGE",
      },
      {
        id: "3",
        image: "img3",
        caption: "c3",
        url: "p3",
        timestamp: "t3",
        mediaType: "CAROUSEL_ALBUM",
      },
    ]);
  });

  it("fetchInstagramPosts throws token error on 400/401", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: { message: "expired" } }),
      }) as unknown as Response,
    );

    await expect(fetchInstagramPosts("token", "user", 10)).rejects.toThrow(
      "Instagram token inválido ou expirado: expired",
    );
  });

  it("fetchInstagramPosts throws generic API error on other statuses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => ({ error: { message: "boom" } }),
      }) as unknown as Response,
    );

    await expect(fetchInstagramPosts("token", "user", 10)).rejects.toThrow(
      "Instagram API error (500): boom",
    );
  });

  it("validateInstagramConfig returns errors when env is missing", () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_USER_ID;
    expect(validateInstagramConfig()).toEqual({
      isValid: false,
      error: "INSTAGRAM_ACCESS_TOKEN não configurado",
    });

    process.env.INSTAGRAM_ACCESS_TOKEN = "t";
    delete process.env.INSTAGRAM_USER_ID;
    expect(validateInstagramConfig()).toEqual({
      isValid: false,
      error: "INSTAGRAM_USER_ID não configurado",
    });
  });

  it("validateInstagramConfig returns values when env is present", () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = "t";
    process.env.INSTAGRAM_USER_ID = "u";
    expect(validateInstagramConfig()).toEqual({
      isValid: true,
      accessToken: "t",
      userId: "u",
    });
  });
});
