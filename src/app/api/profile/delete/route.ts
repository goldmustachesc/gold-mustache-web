import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireValidOrigin } from "@/lib/api/verify-origin";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

/**
 * DELETE /api/profile/delete
 *
 * Permanently deletes the user's account and all associated data:
 * - Appointments (as client)
 * - Profile data
 * - Supabase Auth user (if service role key is configured)
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
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em alguns minutos.",
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autorizado" },
        { status: 401 },
      );
    }

    // Track deletion results for logging
    const deletionResult = {
      userId: user.id,
      profileDeleted: false,
      appointmentsDeleted: 0,
      authUserDeleted: false,
    };

    // First, get the profile to get the profile ID
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    // Delete profile and related data from database
    // Using transaction to ensure all or nothing
    if (profile) {
      const transactionResult = await prisma.$transaction(async (tx) => {
        // Delete appointments associated with the user's profile
        // Note: clientId references Profile.id, not user.id
        const appointmentsResult = await tx.appointment.deleteMany({
          where: { clientId: profile.id },
        });

        // Delete the profile
        await tx.profile.delete({
          where: { id: profile.id },
        });

        return { appointmentsDeleted: appointmentsResult.count };
      });

      deletionResult.profileDeleted = true;
      deletionResult.appointmentsDeleted =
        transactionResult.appointmentsDeleted;
    }

    // Delete user from Supabase Auth using admin client
    // This requires service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseServiceKey && supabaseUrl) {
      const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { error: deleteUserError } =
        await adminClient.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        // Log the error but don't fail - profile data is already deleted
        // The auth user will be orphaned but can be cleaned up manually
        console.error(
          `[Account Delete] Failed to delete auth user ${user.id}:`,
          deleteUserError.message,
        );
      } else {
        deletionResult.authUserDeleted = true;
      }
    } else {
      console.warn(
        "[Account Delete] SUPABASE_SERVICE_ROLE_KEY not configured - auth user not deleted",
      );
    }

    // Log successful deletion for audit purposes
    console.info("[Account Delete] Account deleted successfully:", {
      ...deletionResult,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Conta deletada com sucesso",
    });
  } catch (error) {
    console.error("[Account Delete] Error deleting account:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao deletar conta" },
      { status: 500 },
    );
  }
}
