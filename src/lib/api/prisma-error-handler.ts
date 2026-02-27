import { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import type { ApiErrorResponse } from "@/types/api";

/**
 * Maps Prisma error codes to user-friendly messages
 */
const PRISMA_ERROR_MESSAGES: Record<
  string,
  { message: string; status: number }
> = {
  // Unique constraint violation
  P2002: {
    message: "Já existe um registro com esses dados",
    status: 409,
  },
  // Foreign key constraint violation
  P2003: {
    message:
      "Não foi possível completar a operação devido a referências existentes",
    status: 400,
  },
  // Record not found
  P2025: {
    message: "Registro não encontrado",
    status: 404,
  },
  // Connection pool timeout
  P2024: {
    message:
      "Servidor temporariamente indisponível. Tente novamente em alguns segundos",
    status: 503,
  },
  // Database connection error
  P1001: {
    message: "Não foi possível conectar ao banco de dados",
    status: 503,
  },
  // Query timeout
  P2028: {
    message: "A operação demorou muito tempo. Tente novamente",
    status: 504,
  },
};

/**
 * Handles Prisma errors and returns appropriate NextResponse
 * @param error - The caught error
 * @param fallbackMessage - Default message if error is not a known Prisma error
 * @returns NextResponse with appropriate status and error message
 */
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

  // Handle Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorConfig = PRISMA_ERROR_MESSAGES[error.code];

    if (errorConfig) {
      // For unique constraint violations, try to provide more context
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

    // Unknown Prisma error code
    return apiError(`PRISMA_${error.code}`, fallbackMessage, 500);
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError("PRISMA_VALIDATION", "Dados inválidos fornecidos", 400);
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return apiError(
      "DATABASE_CONNECTION",
      "Não foi possível conectar ao banco de dados",
      503,
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return apiError("INTERNAL_ERROR", fallbackMessage, 500);
  }

  // Unknown error type
  return apiError("UNKNOWN_ERROR", fallbackMessage, 500);
}
