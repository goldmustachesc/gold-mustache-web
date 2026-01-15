import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizePhoneDigits } from "@/lib/booking/phone";

const updateClientSchema = z.object({
  fullName: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 11;
      },
      { message: "Telefone deve ter 10 ou 11 dígitos" },
    ),
});

/**
 * PATCH /api/barbers/me/clients/[id]
 * Updates a guest client's information
 * Only guest clients can be edited (registered clients manage their own profiles)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autenticado" },
        { status: 401 },
      );
    }

    // Verify user is a barber
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Acesso restrito a barbeiros" },
        { status: 403 },
      );
    }

    const { id: clientId } = await params;

    // Check if it's a guest client (only guests can be edited)
    const guestClient = await prisma.guestClient.findUnique({
      where: { id: clientId },
    });

    if (!guestClient) {
      // Check if it's a registered client
      const profile = await prisma.profile.findUnique({
        where: { id: clientId },
      });

      if (profile) {
        return NextResponse.json(
          {
            error: "CANNOT_EDIT_REGISTERED",
            message:
              "Clientes cadastrados gerenciam seus próprios dados pelo perfil",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "NOT_FOUND", message: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: validation.error.issues[0]?.message || "Dados inválidos",
        },
        { status: 400 },
      );
    }

    const { fullName, phone } = validation.data;
    const normalizedPhone = normalizePhoneDigits(phone);

    // Check if new phone is already used by another client (if changed)
    if (normalizedPhone !== guestClient.phone) {
      const existingGuest = await prisma.guestClient.findFirst({
        where: {
          phone: normalizedPhone,
          id: { not: clientId },
        },
      });

      if (existingGuest) {
        return NextResponse.json(
          {
            error: "PHONE_EXISTS",
            message: "Este telefone já está cadastrado para outro cliente",
          },
          { status: 409 },
        );
      }

      // Also check registered profiles
      const existingProfile = await prisma.profile.findFirst({
        where: { phone: normalizedPhone },
      });

      if (existingProfile) {
        return NextResponse.json(
          {
            error: "PHONE_EXISTS",
            message: "Este telefone já está cadastrado para um cliente",
          },
          { status: 409 },
        );
      }
    }

    // Update the guest client
    const updatedClient = await prisma.guestClient.update({
      where: { id: clientId },
      data: {
        fullName: fullName.trim(),
        phone: normalizedPhone,
      },
    });

    return NextResponse.json({
      client: {
        id: updatedClient.id,
        fullName: updatedClient.fullName,
        phone: updatedClient.phone,
        type: "guest",
      },
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao atualizar cliente" },
      { status: 500 },
    );
  }
}
