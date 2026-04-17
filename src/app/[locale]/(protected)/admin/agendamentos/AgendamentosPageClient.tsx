"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AdminAppointmentsFilters } from "@/components/admin/appointments/AdminAppointmentsFilters";
import { AdminAppointmentsTable } from "@/components/admin/appointments/AdminAppointmentsTable";
import { AdminCalendarGrid } from "@/components/admin/appointments/AdminCalendarGrid";
import { AdminCreateAppointmentDialog } from "@/components/admin/appointments/AdminCreateAppointmentDialog";
import type { ListAppointmentsFilters } from "@/services/admin/appointments";

export function AgendamentosPageClient() {
  usePrivateHeader({ title: "Agendamentos", icon: Calendar });

  const [filters, setFilters] = useState<ListAppointmentsFilters>({});
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Tabs defaultValue="list">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Novo agendamento
          </Button>
        </div>

        <TabsContent value="list" className="space-y-4">
          <AdminAppointmentsFilters onFiltersChange={setFilters} />
          <AdminAppointmentsTable filters={filters} />
        </TabsContent>

        <TabsContent value="calendar">
          <AdminCalendarGrid />
        </TabsContent>
      </Tabs>

      <AdminCreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
