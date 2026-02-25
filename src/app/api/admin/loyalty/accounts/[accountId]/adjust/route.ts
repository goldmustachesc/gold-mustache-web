import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireValidOrigin } from "@/lib/api/verify-origin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const originError = requireValidOrigin(req);
  if (originError) return originError;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { accountId } = await params;
    const body = await req.json();
    const { points, reason } = body;

    // Simulate success
    return NextResponse.json({
      success: true,
      message: `Points adjusted for account ${accountId}: ${points} (${reason})`,
    });
  } catch (error) {
    console.error(`[ADMIN_LOYALTY_ACCOUNTS_ADJUST_POST]`, error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
