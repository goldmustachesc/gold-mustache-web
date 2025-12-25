import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { barberAbsenceSchema } from "@/lib/validations/booking";
import {
  parseDateStringToUTC,
  parseTimeToMinutes,
  formatPrismaDateToString,
} from "@/utils/time-slots";
import { AppointmentStatus, type Prisma } from "@prisma/client";

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function GET(request: Request) {
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

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_BARBER", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.BarberAbsenceWhereInput = {
      barberId: barber.id,
    };

    if (startDate) {
      where.date = {
        ...(where.date as object),
        gte: parseDateStringToUTC(startDate),
      };
    }
    if (endDate) {
      const endPlusOne = parseDateStringToUTC(endDate);
      endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
      where.date = { ...(where.date as object), lt: endPlusOne };
    }

    const absences = await prisma.barberAbsence.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      absences: absences.map((a) => ({
        id: a.id,
        barberId: a.barberId,
        date: formatPrismaDateToString(a.date),
        startTime: a.startTime,
        endTime: a.endTime,
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching barber absences:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar ausências" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "NOT_BARBER", message: "Usuário não é barbeiro" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = barberAbsenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const {
      date,
      startTime = null,
      endTime = null,
      reason = null,
    } = validation.data;
    const dateDb = parseDateStringToUTC(date);

    const confirmedAppointments = await prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        date: dateDb,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        client: { select: { fullName: true } },
        guestClient: { select: { fullName: true } },
        service: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }],
    });

    // Conflict detection (you chose: block creation if conflicts exist)
    let conflicts = confirmedAppointments;
    if (startTime && endTime) {
      const absenceStart = parseTimeToMinutes(startTime);
      const absenceEnd = parseTimeToMinutes(endTime);
      conflicts = confirmedAppointments.filter((apt) => {
        const aptStart = parseTimeToMinutes(apt.startTime);
        const aptEnd = parseTimeToMinutes(apt.endTime);
        return rangesOverlap(absenceStart, absenceEnd, aptStart, aptEnd);
      });
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "ABSENCE_CONFLICT",
          message: "Existem agendamentos confirmados no período informado.",
          conflicts: conflicts.map((apt) => ({
            id: apt.id,
            startTime: apt.startTime,
            endTime: apt.endTime,
            serviceName: apt.service.name,
            clientName:
              apt.client?.fullName ?? apt.guestClient?.fullName ?? null,
          })),
        },
        { status: 409 },
      );
    }

    const created = await prisma.barberAbsence.create({
      data: {
        barberId: barber.id,
        date: dateDb,
        startTime,
        endTime,
        reason,
      },
    });

    return NextResponse.json(
      {
        absence: {
          id: created.id,
          barberId: created.barberId,
          date: formatPrismaDateToString(created.date),
          startTime: created.startTime,
          endTime: created.endTime,
          reason: created.reason,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating barber absence:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao criar ausência" },
      { status: 500 },
    );
  }
}
