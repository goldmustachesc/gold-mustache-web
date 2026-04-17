"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminBarbers } from "@/hooks/useAdminBarbers";
import { useAdminServices } from "@/hooks/useAdminServices";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBarberId?: string;
  defaultDate?: string;
  defaultStartTime?: string;
}

type ClientType = "registered" | "guest";

export function AdminCreateAppointmentDialog({
  open,
  onOpenChange,
  defaultBarberId = "",
  defaultDate = "",
  defaultStartTime = "",
}: Props) {
  const queryClient = useQueryClient();
  const { data: barbers = [] } = useAdminBarbers();
  const { data: services = [] } = useAdminServices();

  const [barberId, setBarberId] = useState(defaultBarberId);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [clientType, setClientType] = useState<ClientType>("registered");
  const [clientProfileId, setClientProfileId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setBarberId(defaultBarberId);
    setServiceId("");
    setDate(defaultDate);
    setStartTime(defaultStartTime);
    setClientType("registered");
    setClientProfileId("");
    setGuestName("");
    setGuestPhone("");
    setError("");
  }

  async function handleSubmit() {
    setError("");

    const body =
      clientType === "registered"
        ? { barberId, serviceId, date, startTime, clientProfileId }
        : {
            barberId,
            serviceId,
            date,
            startTime,
            guest: { name: guestName, phone: guestPhone },
          };

    setLoading(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? "Erro ao criar agendamento.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      onOpenChange(false);
      resetForm();
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !!barberId &&
    !!serviceId &&
    !!date &&
    !!startTime &&
    (clientType === "registered"
      ? !!clientProfileId
      : !!guestName && !!guestPhone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um agendamento manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="create-barber">Barbeiro</Label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger id="create-barber">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-service">Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="create-service">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="create-date">Data</Label>
              <Input
                id="create-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-time">Horário</Label>
              <Input
                id="create-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo de cliente</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                size="sm"
                variant={clientType === "registered" ? "default" : "outline"}
                onClick={() => setClientType("registered")}
              >
                Cliente cadastrado
              </Button>
              <Button
                type="button"
                size="sm"
                variant={clientType === "guest" ? "default" : "outline"}
                onClick={() => setClientType("guest")}
              >
                Convidado
              </Button>
            </div>
          </div>

          {clientType === "registered" ? (
            <div className="space-y-1">
              <Label htmlFor="create-profile-id">ID do perfil do cliente</Label>
              <Input
                id="create-profile-id"
                placeholder="UUID do perfil..."
                value={clientProfileId}
                onChange={(e) => setClientProfileId(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-guest-name">Nome</Label>
                <Input
                  id="create-guest-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-guest-phone">Telefone</Label>
                <Input
                  id="create-guest-phone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="47999999999"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? "Criando..." : "Criar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
