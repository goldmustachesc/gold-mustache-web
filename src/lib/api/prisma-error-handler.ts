import { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { PRISMA_ERROR_MESSAGES } from "@/lib/errors/prisma-errors";
import type { ApiErrorResponse } from "@/types/api";

export function handlePrismaError(
  error: unknown,
  fallbackMessage = "Erro interno do servidor",
): NextResponse<ApiErrorResponse> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Database error:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
  } else {
    console.error("Database error:", error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorConfig = PRISMA_ERROR_MESSAGES[error.code];

    if (errorConfig) {
      if (error.code === "P2002" && error.meta?.target) {
        const field = Array.isArray(error.meta.target)
          ? error.meta.target.join(", ")
          : String(error.meta.target);
        return apiError(
          `PRISMA_${error.code}`,
          `${errorConfig.message}: campo(s) ${field}`,
          errorConfig.status,
        );
      }

      return apiError(
        `PRISMA_${error.code}`,
        errorConfig.message,
        errorConfig.status,
      );
    }

    return apiError(`PRISMA_${error.code}`, fallbackMessage, 500);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError("PRISMA_VALIDATION", "Dados inválidos fornecidos", 400);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return apiError(
      "DATABASE_CONNECTION",
      "Não foi possível conectar ao banco de dados",
      503,
    );
  }

  if (error instanceof Error) {
    return apiError("INTERNAL_ERROR", fallbackMessage, 500);
  }

  return apiError("UNKNOWN_ERROR", fallbackMessage, 500);
}
