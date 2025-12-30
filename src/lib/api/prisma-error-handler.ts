import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Error response structure for API endpoints
 */
interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

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
  // Log the error for debugging
  console.error("Database error:", error);

  // Handle Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorConfig = PRISMA_ERROR_MESSAGES[error.code];

    if (errorConfig) {
      // For unique constraint violations, try to provide more context
      if (error.code === "P2002" && error.meta?.target) {
        const field = Array.isArray(error.meta.target)
          ? error.meta.target.join(", ")
          : String(error.meta.target);
        return NextResponse.json(
          {
            error: `PRISMA_${error.code}`,
            message: `${errorConfig.message}: campo(s) ${field}`,
            details: { code: error.code, field },
          },
          { status: errorConfig.status },
        );
      }

      return NextResponse.json(
        {
          error: `PRISMA_${error.code}`,
          message: errorConfig.message,
          details: { code: error.code },
        },
        { status: errorConfig.status },
      );
    }

    // Unknown Prisma error code
    return NextResponse.json(
      {
        error: `PRISMA_${error.code}`,
        message: fallbackMessage,
        details: { code: error.code },
      },
      { status: 500 },
    );
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: "PRISMA_VALIDATION",
        message: "Dados inválidos fornecidos",
      },
      { status: 400 },
    );
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error: "DATABASE_CONNECTION",
        message: "Não foi possível conectar ao banco de dados",
      },
      { status: 503 },
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: fallbackMessage,
      },
      { status: 500 },
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: "UNKNOWN_ERROR",
      message: fallbackMessage,
    },
    { status: 500 },
  );
}
