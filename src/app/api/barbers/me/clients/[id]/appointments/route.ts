import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface ClientAppointmentData {
  id: string;
  date: string;
  startTime: string;
  status: string;
  serviceName: string;
  servicePrice: number;
  barberName: string;
}

/**
 * GET /api/barbers/me/clients/[id]/appointments
 * Lists appointment history for a specific client
 */
export async function GET(
  _request: Request,
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

    // Try to find as registered client first
    const profile = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    // Try to find as guest client
    const guestClient = await prisma.guestClient.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!profile && !guestClient) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Cliente não encontrado" },
        { status: 404 },
      );
    }

    // Fetch appointments based on client type
    const appointments = await prisma.appointment.findMany({
      where: profile
        ? { clientId: profile.id }
        : { guestClientId: guestClient?.id },
      include: {
        service: {
          select: {
            name: true,
            price: true,
          },
        },
        barber: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 50, // Limit to last 50 appointments
    });

    const formattedAppointments: ClientAppointmentData[] = appointments.map(
      (apt) => ({
        id: apt.id,
        date: apt.date.toISOString().split("T")[0],
        startTime: apt.startTime,
        status: apt.status,
        serviceName: apt.service.name,
        servicePrice: Number(apt.service.price),
        barberName: apt.barber.name,
      }),
    );

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error("Error fetching client appointments:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar agendamentos" },
      { status: 500 },
    );
  }
}
