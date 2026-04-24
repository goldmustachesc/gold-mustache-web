"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api/client";
import type {
  CalendarDay,
  AppointmentAdminItem,
} from "@/services/admin/appointments";
import { AdminCalendarSlot } from "./AdminCalendarSlot";
import { AdminAppointmentDrawer } from "./AdminAppointmentDrawer";
import { AdminCreateAppointmentDialog } from "./AdminCreateAppointmentDialog";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUniqueBarbers(days: CalendarDay[]) {
  const seen = new Set<string>();
  const barbers: { id: string; name: string }[] = [];
  for (const day of days) {
    for (const slot of day.slots) {
      if (!seen.has(slot.barberId)) {
        seen.add(slot.barberId);
        barbers.push({ id: slot.barberId, name: slot.barberName });
      }
    }
  }
  return barbers;
}

function getSlotTimes(day: CalendarDay): string[] {
  const times = new Set<string>();
  for (const slot of day.slots) times.add(slot.time);
  return [...times].sort();
}

export function AdminCalendarGrid() {
  const [view] = useState<"day">("day");
  const [date, setDate] = useState(todayStr());
  const [drawerAppointment, setDrawerAppointment] =
    useState<AppointmentAdminItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{
    barberId: string;
    date: string;
    startTime: string;
  }>({ barberId: "", date: "", startTime: "" });

  const { data: calendarDays = [], refetch } = useQuery({
    queryKey: ["admin-calendar", view, date],
    queryFn: () =>
      apiGet<CalendarDay[]>(
        `/api/admin/appointments/calendar?view=${view}&date=${date}`,
      ),
  });

  function openOccupied(apt: AppointmentAdminItem) {
    setDrawerAppointment(apt);
    setDrawerOpen(true);
  }

  function openCreate(barberId: string, slotDate: string, time: string) {
    setCreateDefaults({ barberId, date: slotDate || date, startTime: time });
    setCreateOpen(true);
  }

  const barbers = getUniqueBarbers(calendarDays);
  const currentDay = calendarDays[0];
  const slotTimes = currentDay ? getSlotTimes(currentDay) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDate(addDays(date, -1))}
        >
          ‹ Anterior
        </Button>
        <span className="text-sm font-medium">{date}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDate(addDays(date, 1))}
        >
          Próximo ›
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDate(todayStr())}>
          Hoje
        </Button>
      </div>

      {calendarDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum barbeiro ativo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-16 text-left text-muted-foreground font-normal pb-2" />
                {barbers.map((b) => (
                  <th
                    key={b.id}
                    className="text-center font-medium pb-2 px-1 min-w-[120px]"
                  >
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotTimes.map((time) => (
                <tr key={time} className="border-t border-border/40">
                  <td className="py-0.5 pr-2 text-xs text-muted-foreground">
                    {time}
                  </td>
                  {barbers.map((barber) => {
                    const slot = currentDay?.slots.find(
                      (s) => s.time === time && s.barberId === barber.id,
                    );
                    if (!slot)
                      return <td key={barber.id} className="px-1 py-0.5" />;
                    return (
                      <td key={barber.id} className="px-1 py-0.5">
                        <AdminCalendarSlot
                          slot={slot}
                          date={currentDay?.date ?? date}
                          onFreeSlotClick={openCreate}
                          onOccupiedSlotClick={openOccupied}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminAppointmentDrawer
        appointment={drawerAppointment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onActionComplete={() => void refetch()}
      />

      <AdminCreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultBarberId={createDefaults.barberId}
        defaultDate={createDefaults.date}
        defaultStartTime={createDefaults.startTime}
      />
    </div>
  );
}
