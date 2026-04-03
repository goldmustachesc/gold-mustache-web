import { describe, expect, it } from "vitest";
import { buildDailyOperationalModel } from "../buildDailyOperationalModel";
import type {
  AppointmentWithDetails,
  BarberAbsenceData,
  BarberWorkingHoursDay,
} from "@/types/booking";

function buildAbsence(
  overrides: Partial<BarberAbsenceData> = {},
): BarberAbsenceData {
  return {
    id: "abs-1",
    barberId: "barber-1",
    date: "2026-04-08",
    startTime: null,
    endTime: null,
    reason: "Compromisso",
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    ...overrides,
  };
}

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: "client-1",
    guestClientId: null,
    barberId: "barber-1",
    serviceId: "service-1",
    date: "2026-04-08",
    startTime: "09:30",
    endTime: "10:15",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-20T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
    client: {
      id: "client-1",
      fullName: "Carlos Santos",
      phone: null,
    },
    guestClient: null,
    barber: {
      id: "barber-1",
      name: "Carlos",
      avatarUrl: null,
    },
    service: {
      id: "service-1",
      name: "Corte + Barba",
      duration: 45,
      price: 95,
    },
    ...overrides,
  };
}

const baseWorkingHours: BarberWorkingHoursDay = {
  dayOfWeek: 3,
  isWorking: true,
  startTime: "09:00",
  endTime: "18:00",
  breakStart: null,
  breakEnd: null,
};

const inputBase = {
  selectedDate: "2026-04-08",
  appointments: [buildAppointment()],
  absences: [],
  workingHours: baseWorkingHours,
};

describe("buildDailyOperationalModel", () => {
  it("retorna o atendimento em andamento quando o horário atual cai dentro do slot", () => {
    const result = buildDailyOperationalModel({
      ...inputBase,
      currentDate: "2026-04-08",
      currentTime: "09:45",
    });
    expect(result.hero.kind).toBe("current-appointment");
    expect(result.hero.primaryTime).toBe("09:30");
  });

  it("retorna o próximo atendimento confirmado quando há agenda futura", () => {
    const result = buildDailyOperationalModel({
      ...inputBase,
      currentDate: "2026-04-08",
      currentTime: "09:00",
    });
    expect(result.hero.kind).toBe("next-appointment");
    expect(result.hero.primaryTime).toBe("09:30");
  });

  it("retorna a primeira lacuna livre acionável quando não há atendimento futuro", () => {
    const result = buildDailyOperationalModel({
      ...inputBase,
      appointments: [],
      currentDate: "2026-04-08",
      currentTime: "09:00",
    });
    expect(result.hero.kind).toBe("available-slot");
    expect(result.firstAvailableSlot?.time).toBe("09:00");
  });

  it("retorna blocked-day quando há ausência de dia inteiro", () => {
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "10:00",
      appointments: [],
      absences: [buildAbsence({ reason: "Dia inteiro" })],
      workingHours: baseWorkingHours,
    });
    expect(result.hero.kind).toBe("blocked-day");
    expect(result.hero.primaryTime).toBeNull();
    expect(result.hero.appointmentId).toBeNull();
  });

  it("retorna day-off quando o dia não é de trabalho", () => {
    const dayOff: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: false,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    };
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "10:00",
      appointments: [buildAppointment()],
      absences: [],
      workingHours: dayOff,
    });
    expect(result.hero.kind).toBe("day-off");
    expect(result.hero.primaryTime).toBeNull();
  });

  it("retorna unconfigured-hours quando isWorking é true mas início/fim do expediente não estão definidos", () => {
    const incomplete: BarberWorkingHoursDay = {
      dayOfWeek: 3,
      isWorking: true,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    };
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "10:00",
      appointments: [],
      absences: [],
      workingHours: incomplete,
    });
    expect(result.hero.kind).toBe("unconfigured-hours");
    expect(result.hero.primaryTime).toBeNull();
  });

  it("retorna free-day quando há expediente configurado mas a janela não gera slots nem há atendimentos", () => {
    const zeroWindow: BarberWorkingHoursDay = {
      ...baseWorkingHours,
      startTime: "09:00",
      endTime: "09:00",
    };
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "12:00",
      appointments: [],
      absences: [],
      workingHours: zeroWindow,
    });
    expect(result.timelineItems).toHaveLength(0);
    expect(result.hero.kind).toBe("free-day");
    expect(result.hero.primaryTime).toBeNull();
  });

  it("ignora appointments não confirmados ao montar slots disponíveis", () => {
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "08:00",
      appointments: [
        buildAppointment({
          status: "CANCELLED_BY_BARBER",
          startTime: "09:30",
          endTime: "10:15",
        }),
      ],
      absences: [],
      workingHours: baseWorkingHours,
    });

    expect(
      result.availabilitySlots.map((slot) => ({
        time: slot.time,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      })),
    ).toEqual([{ time: "09:00", endTime: "18:00", isAvailable: true }]);
  });

  it("promove ausência horária cobrindo todo o expediente para blocked-day", () => {
    const result = buildDailyOperationalModel({
      selectedDate: "2026-04-08",
      currentDate: "2026-04-08",
      currentTime: "10:00",
      appointments: [],
      absences: [
        buildAbsence({
          startTime: "09:00",
          endTime: "18:00",
          reason: "Treinamento",
        }),
      ],
      workingHours: baseWorkingHours,
    });

    expect(result.hasFullDayAbsence).toBe(true);
    expect(result.hasPartialAbsences).toBe(false);
    expect(result.availabilitySlots).toEqual([]);
    expect(result.hero.kind).toBe("blocked-day");
  });
});
