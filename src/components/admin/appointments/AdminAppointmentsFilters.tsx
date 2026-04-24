"use client";

import { useState, useCallback } from "react";
import { useAdminBarbers } from "@/hooks/useAdminBarbers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListAppointmentsFilters } from "@/services/admin/appointments";

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "CANCELLED_BY_CLIENT", label: "Cancelado pelo cliente" },
  { value: "CANCELLED_BY_BARBER", label: "Cancelado pelo barbeiro" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "NO_SHOW", label: "Não compareceu" },
] as const;

interface Props {
  onFiltersChange: (filters: ListAppointmentsFilters) => void;
}

export function AdminAppointmentsFilters({ onFiltersChange }: Props) {
  const { data: barbers = [] } = useAdminBarbers();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [barberId, setBarberId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const emit = useCallback(
    (patch: Partial<ListAppointmentsFilters>) => {
      onFiltersChange({
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(barberId ? { barberId } : {}),
        ...(status
          ? { status: status as ListAppointmentsFilters["status"] }
          : {}),
        ...(q ? { q } : {}),
        ...patch,
      });
    },
    [startDate, endDate, barberId, status, q, onFiltersChange],
  );

  function handleQ(value: string) {
    setQ(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => emit({ q: value || undefined }), 300);
    setDebounceTimer(t);
  }

  function handleBarber(value: string) {
    const next = value === "all" ? "" : value;
    setBarberId(next);
    emit({ barberId: next || undefined });
  }

  function handleStatus(value: string) {
    const next = value === "all" ? "" : value;
    setStatus(next);
    emit({ status: (next as ListAppointmentsFilters["status"]) || undefined });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        id="filter-start-date"
        name="filter-start-date"
        type="date"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          emit({ startDate: e.target.value || undefined });
        }}
        className="w-40"
        aria-label="Data inicial"
      />
      <Input
        id="filter-end-date"
        name="filter-end-date"
        type="date"
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          emit({ endDate: e.target.value || undefined });
        }}
        className="w-40"
        aria-label="Data final"
      />

      <Select value={barberId || "all"} onValueChange={handleBarber}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Todos os barbeiros" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os barbeiros</SelectItem>
          {barbers.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status || "all"} onValueChange={handleStatus}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id="filter-client-search"
        name="filter-client-search"
        type="search"
        placeholder="Buscar cliente..."
        value={q}
        onChange={(e) => handleQ(e.target.value)}
        className="w-56"
        aria-label="Buscar cliente"
      />
    </div>
  );
}
