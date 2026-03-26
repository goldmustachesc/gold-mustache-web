import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { apiMessage, apiError } from "@/lib/api/response";

/**
 * DELETE /api/profile/delete
 *
 * Permanently deletes the user's account:
 * - Supabase Auth user (requires SUPABASE_SERVICE_ROLE_KEY)
 * - Profile data
 *
 * Appointments are preserved with client_id set to NULL (ON DELETE SET NULL)
 * to maintain financial history and reporting integrity.
 *
 * This action is irreversible.
 *
 * Protected by:
 * - Origin verification (CSRF protection)
 * - Rate limiting (prevent abuse)
 */
export async function DELETE(request: Request) {
  try {
    // CSRF protection - verify origin
    const originError = requireValidOrigin(request);
    if (originError) return originError;

    // Rate limiting - sensitive operation
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit("sensitive", clientId);
    if (!rateLimitResult.success) {
      return apiError(
        "RATE_LIMITED",
        "Muitas requisições. Tente novamente em alguns minutos.",
        429,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const deletionResult = {
      userId: user.id,
      authUserDeleted: false,
      profileDeleted: false,
    };

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // Transaction safety: external operations first, database second.
    // Supabase Auth is harder to revert; Prisma operations can be retried.

    // Step 1: Delete auth user (external operation — do this first)
    const adminClient = getSupabaseAdmin();

    if (adminClient) {
      const { error: deleteUserError } =
        await adminClient.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error("[Account Delete] Auth deletion failed, aborting:", {
          userId: user.id,
          error: deleteUserError.message,
          timestamp: new Date().toISOString(),
        });
        return apiError(
          "DELETE_FAILED",
          "Erro ao deletar conta. Tente novamente.",
          500,
        );
      }

      deletionResult.authUserDeleted = true;
    } else {
      console.error(
        "[Account Delete] SUPABASE_SERVICE_ROLE_KEY not configured - cannot safely delete account",
      );
      return apiError(
        "CONFIG_ERROR",
        "Serviço temporariamente indisponível. Tente novamente mais tarde.",
        500,
      );
    }

    // Step 2: Delete profile (can be retried/cleaned up if this fails)
    // ON DELETE SET NULL cascades to appointments.client_id, preserving appointment history.
    if (profile) {
      try {
        await prisma.profile.delete({
          where: { id: profile.id },
        });

        deletionResult.profileDeleted = true;
      } catch (dbError) {
        // Auth user already deleted but DB cleanup failed.
        // From the user's perspective the account is gone (can't log in).
        // Orphaned DB records can be cleaned up via cron or manually.
        console.error(
          "[Account Delete] PARTIAL DELETE - auth deleted but DB cleanup failed:",
          {
            userId: user.id,
            profileId: profile.id,
            authDeleted: deletionResult.authUserDeleted,
            error: dbError instanceof Error ? dbError.message : String(dbError),
            timestamp: new Date().toISOString(),
          },
        );
      }
    }

    console.info("[Account Delete] Account deleted:", {
      ...deletionResult,
      timestamp: new Date().toISOString(),
    });

    return apiMessage("Conta deletada com sucesso");
  } catch (error) {
    return handlePrismaError(error, "Erro ao deletar conta");
  }
}
