import { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { PRISMA_ERROR_MESSAGES } from "@/lib/errors/prisma-errors";
import type { ApiErrorResponse } from "@/types/api";

interface PrismaLikeKnownRequestError {
  code: string;
  message: string;
  meta?: unknown;
}

function isPrismaLikeKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError | PrismaLikeKnownRequestError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return true;
  }

  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return (
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code) &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function getPrismaLikeMeta(
  error: Prisma.PrismaClientKnownRequestError | PrismaLikeKnownRequestError,
): Record<string, unknown> | undefined {
  const meta = error.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return undefined;
  }

  return meta as Record<string, unknown>;
}

export function handlePrismaError(
  error: unknown,
  fallbackMessage = "Erro interno do servidor",
): NextResponse<ApiErrorResponse> {
  if (isPrismaLikeKnownRequestError(error)) {
    console.error("Database error:", {
      code: error.code,
      message: error.message,
      meta: getPrismaLikeMeta(error),
    });
  } else {
    console.error("Database error:", error);
  }

  if (isPrismaLikeKnownRequestError(error)) {
    const errorConfig = PRISMA_ERROR_MESSAGES[error.code];

    if (errorConfig) {
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
