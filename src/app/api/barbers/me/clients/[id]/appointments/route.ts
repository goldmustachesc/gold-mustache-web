import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { requireBarber } from "@/lib/auth/requireBarber";

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
    const auth = await requireBarber();
    if (!auth.ok) return auth.response;

    const { id: clientId } = await params;

    const profile = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

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
      take: 50,
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
    return handlePrismaError(error, "Erro ao buscar agendamentos");
  }
}
