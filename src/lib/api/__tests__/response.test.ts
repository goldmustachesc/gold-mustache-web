import { describe, it, expect } from "vitest";
import { apiSuccess, apiCollection, apiMessage, apiError } from "../response";

describe("apiSuccess", () => {
  it("returns { data } with status 200 by default", async () => {
    const res = apiSuccess({ id: "1", name: "Test" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { id: "1", name: "Test" } });
  });

  it("supports custom status", async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiCollection", () => {
  it("returns { data } without meta when meta is omitted", async () => {
    const res = apiCollection([1, 2, 3]);
    const body = await res.json();
    expect(body).toEqual({ data: [1, 2, 3] });
    expect(body).not.toHaveProperty("meta");
  });

  it("returns { data, meta } when meta is provided", async () => {
    const meta = { total: 50, page: 2, limit: 10, totalPages: 5 };
    const res = apiCollection(["a", "b"], meta);
    const body = await res.json();
    expect(body).toEqual({ data: ["a", "b"], meta });
  });

  it("defaults to status 200", () => {
    const res = apiCollection([]);
    expect(res.status).toBe(200);
  });
});

describe("apiMessage", () => {
  it("returns { success: true } without message when omitted", async () => {
    const res = apiMessage();
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(body).not.toHaveProperty("message");
  });

  it("includes message when provided", async () => {
    const res = apiMessage("Deleted successfully");
    const body = await res.json();
    expect(body).toEqual({ success: true, message: "Deleted successfully" });
  });

  it("defaults to status 200", () => {
    expect(apiMessage().status).toBe(200);
  });
});

describe("apiError", () => {
  it("returns { error, message } with given status", async () => {
    const res = apiError("NOT_FOUND", "Resource not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "NOT_FOUND", message: "Resource not found" });
  });

  it("includes details when provided", async () => {
    const res = apiError("VALIDATION", "Invalid", 400, { field: "email" });
    const body = await res.json();
    expect(body).toEqual({
      error: "VALIDATION",
      message: "Invalid",
      details: { field: "email" },
    });
  });

  it("omits details when not provided", async () => {
    const res = apiError("ERR", "msg", 500);
    const body = await res.json();
    expect(body).not.toHaveProperty("details");
  });
});
