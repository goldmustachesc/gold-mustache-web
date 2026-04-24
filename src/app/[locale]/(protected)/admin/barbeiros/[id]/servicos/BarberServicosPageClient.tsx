"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Scissors } from "lucide-react";
import { apiGet, apiMutate } from "@/lib/api/client";
import { useAdminServices } from "@/hooks/useAdminServices";

interface BarberServiceLink {
  serviceId: string;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number | string;
    active: boolean;
  };
}

interface BarberDetails {
  id: string;
  name: string;
  services: BarberServiceLink[];
}

export function BarberServicosPageClient() {
  const params = useParams();
  const locale = String(params.locale ?? "pt-BR");
  const barberId = String(params.id ?? "");
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  usePrivateHeader({
    title: "Serviços do Barbeiro",
    icon: Scissors,
    backHref: `/${locale}/admin/barbeiros`,
  });

  const { data: barber, isLoading: barberLoading } = useQuery({
    queryKey: ["admin-barber-details", barberId],
    queryFn: () => apiGet<BarberDetails>(`/api/admin/barbers/${barberId}`),
    enabled: barberId.length > 0,
  });

  const { data: services = [], isLoading: servicesLoading } =
    useAdminServices();

  useEffect(() => {
    if (!barber) return;
    setSelectedIds(barber.services.map((link) => link.serviceId));
  }, [barber]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleService(serviceId: string) {
    setSelectedIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await apiMutate(`/api/admin/barbers/${barberId}`, "PUT", {
        serviceIds: selectedIds,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-barber-details", barberId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-services"] }),
      ]);

      toast.success("Serviços do barbeiro atualizados com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar serviços",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (barberLoading || servicesLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Barbeiro não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PrivateHeaderActions>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="hidden lg:flex"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar
        </Button>
      </PrivateHeaderActions>

      <main className="container mx-auto max-w-4xl px-4 py-6 lg:py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{barber.name}</h2>
          <p className="text-sm text-muted-foreground">
            Selecione quais serviços este barbeiro pode executar.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => {
            const isSelected = selectedSet.has(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => service.active && toggleService(service.id)}
                disabled={!service.active}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/40"
                } ${!service.active ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.duration} min · R${" "}
                      {Number(service.price).toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "Selecionado" : "Selecionar"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:hidden">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar serviços
          </Button>
        </div>
      </main>
    </div>
  );
}
