import { describe, expect, it, vi } from "vitest";
import {
  buildWorkingHoursResponse,
  upsertWorkingHoursInTransaction,
} from "../working-hours";

describe("working-hours", () => {
  it("monta a resposta completa da semana preenchendo dias sem expediente", () => {
    const result = buildWorkingHoursResponse([
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      {
        dayOfWeek: 5,
        startTime: "10:00",
        endTime: "19:00",
        breakStart: null,
        breakEnd: null,
      },
    ]);

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      dayOfWeek: 0,
      isWorking: false,
      startTime: null,
      endTime: null,
      breakStart: null,
      breakEnd: null,
    });
    expect(result[1]).toEqual({
      dayOfWeek: 1,
      isWorking: true,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
    });
    expect(result[5]).toEqual({
      dayOfWeek: 5,
      isWorking: true,
      startTime: "10:00",
      endTime: "19:00",
      breakStart: null,
      breakEnd: null,
    });
    expect(result[6]?.isWorking).toBe(false);
  });

  it("faz upsert para dias trabalhados e remove dias nao trabalhados na transacao", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const deleteMany = vi.fn().mockResolvedValue(undefined);
    const tx = {
      workingHours: {
        upsert,
        deleteMany,
      },
    };

    await upsertWorkingHoursInTransaction(tx as never, "barber-1", [
      {
        dayOfWeek: 1,
        isWorking: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      {
        dayOfWeek: 2,
        isWorking: true,
        startTime: "10:00",
        endTime: "19:00",
        breakStart: undefined,
        breakEnd: undefined,
      },
      {
        dayOfWeek: 3,
        isWorking: false,
        startTime: null,
        endTime: null,
        breakStart: null,
        breakEnd: null,
      },
      {
        dayOfWeek: 4,
        isWorking: true,
        startTime: null,
        endTime: "18:00",
        breakStart: null,
        breakEnd: null,
      },
    ]);

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: {
        barberId_dayOfWeek: {
          barberId: "barber-1",
          dayOfWeek: 1,
        },
      },
      create: {
        barberId: "barber-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
      update: {
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
      },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: {
        barberId_dayOfWeek: {
          barberId: "barber-1",
          dayOfWeek: 2,
        },
      },
      create: {
        barberId: "barber-1",
        dayOfWeek: 2,
        startTime: "10:00",
        endTime: "19:00",
        breakStart: null,
        breakEnd: null,
      },
      update: {
        startTime: "10:00",
        endTime: "19:00",
        breakStart: null,
        breakEnd: null,
      },
    });

    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        barberId: "barber-1",
        dayOfWeek: 3,
      },
    });
    expect(deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        barberId: "barber-1",
        dayOfWeek: 4,
      },
    });
  });
});
