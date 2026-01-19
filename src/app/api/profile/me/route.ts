import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { linkGuestAppointmentsToProfile } from "@/services/guest-linking";

export async function GET() {
  try {
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

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          fullName:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
          phone: user.user_metadata?.phone || null,
        },
      });

      // Link any guest appointments to this new profile
      if (profile.phone) {
        await linkGuestAppointmentsToProfile(profile.id, profile.phone);
      }
    }

    // Use only profile.emailVerified - the application's own flag
    // This ensures the user must explicitly verify via the email link
    // Do NOT use user.email_confirmed_at as Supabase may auto-set it
    const emailVerified = profile.emailVerified;

    return NextResponse.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        street: profile.street,
        number: profile.number,
        complement: profile.complement,
        neighborhood: profile.neighborhood,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        emailVerified,
        role: profile.role,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar perfil" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
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

    const body = await request.json();

    // Validate input with Zod using safeParse
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: firstError?.message || "Dados inválidos",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;

    // Sanitize input - trim strings and convert empty to undefined
    const updateData: Record<string, string | undefined> = {};
    if (validatedData.fullName !== undefined)
      updateData.fullName = validatedData.fullName.trim() || undefined;
    if (validatedData.phone !== undefined)
      updateData.phone = validatedData.phone.trim() || undefined;
    if (validatedData.street !== undefined)
      updateData.street = validatedData.street.trim() || undefined;
    if (validatedData.number !== undefined)
      updateData.number = validatedData.number.trim() || undefined;
    if (validatedData.complement !== undefined)
      updateData.complement = validatedData.complement.trim() || undefined;
    if (validatedData.neighborhood !== undefined)
      updateData.neighborhood = validatedData.neighborhood.trim() || undefined;
    if (validatedData.city !== undefined)
      updateData.city = validatedData.city.trim() || undefined;
    if (validatedData.state !== undefined)
      updateData.state = validatedData.state.trim() || undefined;
    if (validatedData.zipCode !== undefined)
      updateData.zipCode = validatedData.zipCode.trim() || undefined;

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: updateData,
    });

    // If phone was updated, try to link any guest appointments
    if (updateData.phone && profile.phone) {
      await linkGuestAppointmentsToProfile(profile.id, profile.phone);
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
        street: profile.street,
        number: profile.number,
        complement: profile.complement,
        neighborhood: profile.neighborhood,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        emailVerified: profile.emailVerified,
        role: profile.role,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao atualizar perfil" },
      { status: 500 },
    );
  }
}
