import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface CancelledAppointmentData {
  id: string;
  date: string;
  startTime: string;
  clientName: string;
  serviceName: string;
  servicePrice: number;
  cancelledBy: "CLIENT" | "BARBER";
  cancelReason: string | null;
  barberName: string;
}

/**
 * GET /api/barbers/me/cancelled-appointments
 * Lists all cancelled appointments from the barbershop
 */
export async function GET() {
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

    // Fetch all cancelled appointments from the barbershop
    const cancelledAppointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ["CANCELLED_BY_CLIENT", "CANCELLED_BY_BARBER"],
        },
      },
      include: {
        client: {
          select: {
            fullName: true,
          },
        },
        guestClient: {
          select: {
            fullName: true,
          },
        },
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
    });

    const appointments: CancelledAppointmentData[] = cancelledAppointments.map(
      (apt) => ({
        id: apt.id,
        date: apt.date.toISOString().split("T")[0],
        startTime: apt.startTime,
        clientName:
          apt.client?.fullName || apt.guestClient?.fullName || "Cliente",
        serviceName: apt.service.name,
        servicePrice: Number(apt.service.price),
        cancelledBy: apt.status === "CANCELLED_BY_CLIENT" ? "CLIENT" : "BARBER",
        cancelReason: apt.cancelReason,
        barberName: apt.barber.name,
      }),
    );

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error fetching cancelled appointments:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Erro ao buscar agendamentos cancelados",
      },
      { status: 500 },
    );
  }
}
