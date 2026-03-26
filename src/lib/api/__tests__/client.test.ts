import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ApiError,
  apiGet,
  apiGetCollection,
  apiMutate,
  apiAction,
} from "../client";

function stubFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

function stubFetchJsonError(status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status,
      json: () => Promise.reject(new Error("invalid json")),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiError", () => {
  it("stores code, message, status, and details", () => {
    const err = new ApiError("NOT_FOUND", "Not found", 404, { id: "1" });
    expect(err.name).toBe("ApiError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ id: "1" });
  });

  it("extends Error", () => {
    const err = new ApiError("ERR", "msg", 500);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("apiGet", () => {
  it("unwraps json.data on success", async () => {
    stubFetch({ data: { id: "1", name: "Test" } });
    const result = await apiGet<{ id: string; name: string }>("/api/test");
    expect(result).toEqual({ id: "1", name: "Test" });
  });

  it("throws ApiError on non-OK response", async () => {
    stubFetch({ error: "NOT_FOUND", message: "Not found" }, false, 404);
    await expect(apiGet("/api/test")).rejects.toThrow(ApiError);
    await expect(apiGet("/api/test")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("uses fallback error message when response has no message", async () => {
    stubFetch(null, false, 500);
    await expect(apiGet("/api/test")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "Request failed with status 500",
    });
  });

  it("throws PARSE_ERROR when response body is not valid JSON", async () => {
    stubFetchJsonError();
    await expect(apiGet("/api/test")).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("passes extra headers when provided", async () => {
    stubFetch({ data: "ok" });
    await apiGet("/api/test", { Authorization: "Bearer token" });
    expect(fetch).toHaveBeenCalledWith("/api/test", {
      headers: { Authorization: "Bearer token" },
    });
  });
});

describe("apiGetCollection", () => {
  it("returns raw JSON without unwrapping data", async () => {
    const body = {
      data: [{ id: "1" }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    stubFetch(body);
    const result = await apiGetCollection("/api/items");
    expect(result).toEqual(body);
  });
});

describe("apiMutate", () => {
  it("sends method and JSON body with Content-Type header", async () => {
    stubFetch({ data: { id: "1" } });
    await apiMutate("/api/items", "POST", { name: "Test" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ name: "Test" }),
      }),
    );
  });

  it("merges custom headers", async () => {
    stubFetch({ data: {} });
    await apiMutate("/api/items", "POST", {}, { "X-Custom": "val" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Custom": "val",
        }),
      }),
    );
  });

  it("omits body when undefined", async () => {
    stubFetch({ data: {} });
    await apiMutate("/api/items", "DELETE");
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(callArgs).not.toHaveProperty("body");
  });
});

describe("apiAction", () => {
  it("returns message response", async () => {
    stubFetch({ success: true, message: "Done" });
    const result = await apiAction("/api/action", "PATCH");
    expect(result).toEqual({ success: true, message: "Done" });
  });
});
