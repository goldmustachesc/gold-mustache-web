"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ListAppointmentsFilters,
  AppointmentAdminItem,
} from "@/services/admin/appointments";
import { AdminAppointmentDrawer } from "./AdminAppointmentDrawer";

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  CANCELLED_BY_CLIENT: "Cancelado (cliente)",
  CANCELLED_BY_BARBER: "Cancelado (barbeiro)",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse {
  data: AppointmentAdminItem[];
  meta: PaginationMeta;
}

async function fetchAppointments(
  filters: ListAppointmentsFilters,
  page: number,
): Promise<ApiResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.barberId) params.set("barberId", filters.barberId);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(page));
  params.set("limit", "20");

  const res = await fetch(`/api/admin/appointments?${params}`);
  if (!res.ok) throw new Error("Erro ao carregar agendamentos");
  return res.json() as Promise<ApiResponse>;
}

interface Props {
  filters: ListAppointmentsFilters;
}

export function AdminAppointmentsTable({ filters }: Props) {
  const [page, setPage] = useState(1);
  const [drawerAppointment, setDrawerAppointment] =
    useState<AppointmentAdminItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-appointments", filters, page],
    queryFn: () => fetchAppointments(filters, page),
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Erro ao carregar agendamentos.
      </div>
    );
  }

  const rows = data?.data ?? [];
  const meta = data?.meta;

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum agendamento encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Barbeiro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.startTime}</TableCell>
                <TableCell>
                  {row.client?.fullName ?? row.guestClient?.fullName ?? "—"}
                </TableCell>
                <TableCell>{row.service?.name ?? "—"}</TableCell>
                <TableCell>{row.barber?.name ?? "—"}</TableCell>
                <TableCell>{STATUS_LABELS[row.status] ?? row.status}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDrawerAppointment(row);
                      setDrawerOpen(true);
                    }}
                  >
                    •••
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {meta.page} de {meta.totalPages} ({meta.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <AdminAppointmentDrawer
        appointment={drawerAppointment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onActionComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
        }}
      />
    </div>
  );
}
