import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "../prisma-error-handler";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createKnownError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  const error = new Prisma.PrismaClientKnownRequestError("DB error", {
    code,
    clientVersion: "5.0.0",
    meta,
  });
  return error;
}

describe("handlePrismaError", () => {
  it("handles P2002 with target field", async () => {
    const error = createKnownError("P2002", { target: ["email"] });
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("PRISMA_P2002");
    expect(body.message).toContain("email");
  });

  it("handles P2002 without target", async () => {
    const error = createKnownError("P2002");
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("PRISMA_P2002");
  });

  it("handles P2003 (foreign key)", async () => {
    const error = createKnownError("P2003");
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("PRISMA_P2003");
  });

  it("handles P2025 (not found)", async () => {
    const error = createKnownError("P2025");
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("PRISMA_P2025");
  });

  it("handles unknown Prisma error code with fallback", async () => {
    const error = createKnownError("P9999");
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("PRISMA_P9999");
  });

  it("handles PrismaClientValidationError", async () => {
    const error = new Prisma.PrismaClientValidationError("Validation failed", {
      clientVersion: "5.0.0",
    });
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("PRISMA_VALIDATION");
  });

  it("handles PrismaClientInitializationError", async () => {
    const error = new Prisma.PrismaClientInitializationError(
      "Cannot connect",
      "5.0.0",
    );
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toBe("DATABASE_CONNECTION");
  });

  it("handles Prisma-like errors when runtime strips the prototype", async () => {
    const error = {
      message: "Cannot connect",
      code: "P1001",
      meta: { database_location: "db.example.com:6543" },
    };

    const res = handlePrismaError(error);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("PRISMA_P1001");
    expect(body.message).toBe("Não foi possível conectar ao banco de dados");
  });

  it("handles generic Error", async () => {
    const error = new Error("Something broke");
    const res = handlePrismaError(error);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("INTERNAL_ERROR");
  });

  it("handles non-Error thrown values", async () => {
    const res = handlePrismaError("string error");
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("UNKNOWN_ERROR");
  });

  it("uses custom fallback message", async () => {
    const res = handlePrismaError(new Error("x"), "Custom error message");
    const body = await res.json();
    expect(body.message).toBe("Custom error message");
  });
});
