import { Prisma } from "@prisma/client";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSafeAction } from "../safe-action";

const mockGetUser = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

function createSupabaseClient(userId?: string) {
  return {
    auth: {
      getUser: mockGetUser.mockResolvedValue({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
  };
}

describe("createSafeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna UNAUTHORIZED quando nao existe usuario autenticado", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient());
    const handler = vi.fn();
    const action = createSafeAction({
      handler,
    });

    const result = await action();

    expect(result).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      error: "Não autorizado",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("valida o input com schema antes de chamar o handler", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient("user-1"));
    const handler = vi.fn();
    const action = createSafeAction({
      schema: z.object({
        amount: z.number().min(1, "Valor minimo 1"),
      }),
      handler,
    });

    const result = await action({ amount: 0 });

    expect(result).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Valor minimo 1",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("passa input parseado e contexto autenticado para o handler", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient("user-1"));
    const handler = vi.fn().mockResolvedValue({
      success: true,
      data: { total: 2 },
    });
    const action = createSafeAction({
      schema: z.object({
        amount: z.coerce.number(),
      }),
      handler,
    });

    const result = await action({ amount: "2" } as unknown as {
      amount: number;
    });

    expect(handler).toHaveBeenCalledWith({ amount: 2 }, { userId: "user-1" });
    expect(result).toEqual({
      success: true,
      data: { total: 2 },
    });
  });

  it("mapeia PrismaClientKnownRequestError para codigo PRISMA", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient("user-1"));
    const handler = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("DB error", {
        code: "P2002",
        clientVersion: "6.0.0",
      }),
    );
    const action = createSafeAction({
      handler,
    });

    const result = await action();

    expect(result).toEqual({
      success: false,
      code: "PRISMA_P2002",
      error: "Já existe um registro com esses dados",
    });
  });

  it("mapeia PrismaClientValidationError e PrismaClientInitializationError", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient("user-1"));
    const validationHandler = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientValidationError("Validation failed", {
        clientVersion: "6.0.0",
      }),
    );
    const validationAction = createSafeAction({
      handler: validationHandler,
    });

    await expect(validationAction()).resolves.toEqual({
      success: false,
      code: "PRISMA_VALIDATION",
      error: "Dados inválidos fornecidos",
    });

    const initHandler = vi
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientInitializationError("Cannot connect", "6.0.0"),
      );
    const initAction = createSafeAction({
      handler: initHandler,
    });

    await expect(initAction()).resolves.toEqual({
      success: false,
      code: "DATABASE_CONNECTION",
      error: "Não foi possível conectar ao banco de dados",
    });
  });

  it("faz fallback para INTERNAL_ERROR em erros desconhecidos", async () => {
    mockCreateClient.mockResolvedValue(createSupabaseClient("user-1"));
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const action = createSafeAction({
      handler,
    });

    const result = await action();

    expect(result).toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "Erro interno do servidor",
    });
  });
});
