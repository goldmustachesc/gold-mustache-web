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
import { Loader2, Save, Scissors, RotateCcw } from "lucide-react";
import { apiGet, apiMutate } from "@/lib/api/client";
import { useAdminServices } from "@/hooks/useAdminServices";

interface BarberServiceLink {
  serviceId: string;
  durationOverride: number | null;
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
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [overrideErrors, setOverrideErrors] = useState<Record<string, string>>(
    {},
  );
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>(
    {},
  );
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
    const initialOverrides: Record<string, number | null> = {};
    for (const link of barber.services) {
      initialOverrides[link.serviceId] = link.durationOverride;
    }
    setOverrides(initialOverrides);
  }, [barber]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleService(serviceId: string) {
    setSelectedIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function setOverrideError(serviceId: string, message: string | null) {
    setOverrideErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[serviceId] = message;
      } else {
        delete next[serviceId];
      }
      return next;
    });
  }

  function handleOverrideChange(
    serviceId: string,
    rawValue: string,
    defaultDuration: number,
  ) {
    setOverrideInputs((prev) => ({ ...prev, [serviceId]: rawValue }));
    const trimmed = rawValue.trim();
    if (trimmed === "") {
      setOverrides((prev) => ({ ...prev, [serviceId]: null }));
      setOverrideError(serviceId, null);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setOverrideError(serviceId, "Digite um número válido.");
      return;
    }
    if (parsed < 5 || parsed > 240) {
      setOverrideError(serviceId, "Use entre 5 e 240 minutos.");
      return;
    }
    if (parsed % 5 !== 0) {
      setOverrideError(serviceId, "Use múltiplos de 5 minutos.");
      return;
    }
    setOverrideError(serviceId, null);
    setOverrides((prev) => ({
      ...prev,
      [serviceId]: parsed === defaultDuration ? null : parsed,
    }));
  }

  function clearOverride(serviceId: string) {
    setOverrides((prev) => ({ ...prev, [serviceId]: null }));
    setOverrideError(serviceId, null);
    setOverrideInputs((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await apiMutate(`/api/admin/barbers/${barberId}`, "PUT", {
        services: selectedIds.map((serviceId) => ({
          serviceId,
          durationOverride: overrides[serviceId] ?? null,
        })),
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

  const hasOverrideErrors = Object.keys(overrideErrors).length > 0;

  return (
    <div>
      <PrivateHeaderActions>
        <Button
          onClick={handleSave}
          disabled={isSaving || hasOverrideErrors}
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
            Selecione quais serviços este barbeiro pode executar e ajuste o
            tempo de cada um.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => {
            const isSelected = selectedSet.has(service.id);
            const override = overrides[service.id] ?? null;
            const hasCustomDuration =
              override !== null && override !== service.duration;
            const inputValue = overrideInputs[service.id];
            const displayDuration =
              inputValue !== undefined
                ? inputValue
                : String(override ?? service.duration);
            const overrideError = overrideErrors[service.id];

            return (
              <div
                key={service.id}
                className={`rounded-xl border transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/40"
                } ${!service.active ? "opacity-50" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => service.active && toggleService(service.id)}
                  disabled={!service.active}
                  className={`w-full p-4 text-left ${!service.active ? "cursor-not-allowed" : "hover:bg-primary/5"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Padrão: {service.duration} min · R${" "}
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

                {isSelected && (
                  <fieldset
                    className="px-4 pb-4 border-t border-border/50 pt-3 border-x-0 border-b-0 m-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <legend className="text-xs text-muted-foreground mb-1.5">
                      Sua duração
                    </legend>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={240}
                        step={5}
                        value={displayDuration}
                        aria-invalid={overrideError ? true : undefined}
                        aria-describedby={
                          overrideError
                            ? `override-error-${service.id}`
                            : undefined
                        }
                        onChange={(e) =>
                          handleOverrideChange(
                            service.id,
                            e.target.value,
                            service.duration,
                          )
                        }
                        className={`w-20 rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
                          overrideError
                            ? "border-destructive focus:ring-destructive"
                            : "border-input focus:ring-primary"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                      {hasCustomDuration ? (
                        <>
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                            personalizado
                          </span>
                          <button
                            type="button"
                            onClick={() => clearOverride(service.id)}
                            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            title="Restaurar duração padrão"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurar
                          </button>
                        </>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          padrão
                        </span>
                      )}
                    </div>
                    {overrideError ? (
                      <p
                        id={`override-error-${service.id}`}
                        className="mt-1.5 text-xs text-destructive"
                        role="alert"
                      >
                        {overrideError}
                      </p>
                    ) : null}
                  </fieldset>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:hidden">
          <Button
            onClick={handleSave}
            disabled={isSaving || hasOverrideErrors}
            className="w-full"
          >
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
