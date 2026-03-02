import type { z } from "zod";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { PRISMA_ERROR_MESSAGES } from "@/lib/errors/prisma-errors";
import { actionError, type ActionResult } from "./types";

interface AuthContext {
  userId: string;
}

type SafeActionReturn<TInput, TOutput> = [TInput] extends [undefined]
  ? () => Promise<ActionResult<TOutput>>
  : (input: TInput) => Promise<ActionResult<TOutput>>;

export function createSafeAction<TInput = undefined, TOutput = void>(options: {
  schema?: z.ZodType<TInput>;
  handler: (input: TInput, ctx: AuthContext) => Promise<ActionResult<TOutput>>;
}): SafeActionReturn<TInput, TOutput> {
  const action = async (input?: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return actionError("UNAUTHORIZED", "Não autorizado");
      }

      let parsedInput = input as TInput;

      if (options.schema && input !== undefined) {
        const validation = options.schema.safeParse(input);
        if (!validation.success) {
          const firstError =
            validation.error.issues[0]?.message ?? "Dados inválidos";
          return actionError("VALIDATION_ERROR", firstError);
        }
        parsedInput = validation.data;
      }

      return await options.handler(parsedInput, { userId: user.id });
    } catch (error) {
      return handleActionError(error);
    }
  };

  return action as SafeActionReturn<TInput, TOutput>;
}

function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Database error:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });

    const errorConfig = PRISMA_ERROR_MESSAGES[error.code];
    return actionError(
      `PRISMA_${error.code}`,
      errorConfig?.message ?? "Erro interno do servidor",
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return actionError("PRISMA_VALIDATION", "Dados inválidos fornecidos");
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return actionError(
      "DATABASE_CONNECTION",
      "Não foi possível conectar ao banco de dados",
    );
  }

  console.error("Server action error:", error);
  return actionError("INTERNAL_ERROR", "Erro interno do servidor");
}
