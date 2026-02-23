import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LoyaltyService } from "@/services/loyalty/loyalty.service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const account = await LoyaltyService.getOrCreateAccount(profile.id);

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error("[LOYALTY_ACCOUNT_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
