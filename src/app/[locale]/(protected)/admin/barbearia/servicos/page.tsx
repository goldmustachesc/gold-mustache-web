"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useAdminServices,
  useCreateAdminService,
  useUpdateAdminService,
  useToggleAdminServiceStatus,
  type AdminServiceData,
} from "@/hooks/useAdminServices";
import {
  Scissors,
  Plus,
  Save,
  Pencil,
  X,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";

// Duration options (multiples of 15 minutes)
const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 75, label: "1h 15min" },
  { value: 90, label: "1h 30min" },
  { value: 105, label: "1h 45min" },
  { value: 120, label: "2h" },
  { value: 135, label: "2h 15min" },
  { value: 150, label: "2h 30min" },
  { value: 165, label: "2h 45min" },
  { value: 180, label: "3h" },
];

type FormMode = "create" | "edit";

interface FormState {
  name: string;
  description: string;
  duration: number;
  price: string;
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  description: "",
  duration: 30,
  price: "",
};

function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

function parsePriceInput(value: string): number {
  // Remove currency symbol and spaces
  const cleaned = value.replace(/[R$\s]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function AdminServicesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileMe();

  // Admin check
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!profileLoading && profile && profile.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores");
      router.push(`/${locale}/dashboard`);
    }
  }, [profile, profileLoading, router, locale]);

  // Services data
  const { data: services = [], isLoading: servicesLoading } =
    useAdminServices();
  const createService = useCreateAdminService();
  const updateService = useUpdateAdminService();
  const toggleStatus = useToggleAdminServiceStatus();

  // Form state
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});

  const isLoading = userLoading || profileLoading;
  const isMutating =
    createService.isPending ||
    updateService.isPending ||
    toggleStatus.isPending;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="container mx-auto max-w-4xl p-8">
        <p className="text-destructive">Erro ao carregar perfil.</p>
      </div>
    );
  }

  if (!profile || profile.role !== "ADMIN") {
    return null;
  }

  const validateForm = (): boolean => {
    const errors: Partial<FormState> = {};

    if (!form.name || form.name.trim().length < 3) {
      errors.name = "Nome deve ter pelo menos 3 caracteres";
    }

    const price = parsePriceInput(form.price);
    if (price <= 0) {
      errors.price = "Preço deve ser maior que zero";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const price = parsePriceInput(form.price);

    try {
      if (formMode === "create") {
        await createService.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          duration: form.duration,
          price,
        });
        toast.success("Serviço criado com sucesso!");
      } else if (editingId) {
        await updateService.mutateAsync({
          id: editingId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          duration: form.duration,
          price,
        });
        toast.success("Serviço atualizado com sucesso!");
      }

      // Reset form
      setForm(INITIAL_FORM_STATE);
      setFormMode("create");
      setEditingId(null);
      setFormErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar serviço",
      );
    }
  };

  const handleEdit = (service: AdminServiceData) => {
    setFormMode("edit");
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      duration: service.duration,
      price: service.price.toFixed(2).replace(".", ","),
    });
    setFormErrors({});
  };

  const handleCancelEdit = () => {
    setFormMode("create");
    setEditingId(null);
    setForm(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  const handleToggleStatus = async (service: AdminServiceData) => {
    try {
      await toggleStatus.mutateAsync({
        id: service.id,
        active: !service.active,
      });
      toast.success(service.active ? "Serviço desativado" : "Serviço ativado");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status do serviço",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Serviços da Barbearia</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {formMode === "create" ? (
                <>
                  <Plus className="h-5 w-5" />
                  Novo Serviço
                </>
              ) : (
                <>
                  <Pencil className="h-5 w-5" />
                  Editar Serviço
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Corte Masculino"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={cn(formErrors.name && "border-destructive")}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Inclui lavagem"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duração *</Label>
                <Select
                  value={String(form.duration)}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, duration: Number(value) }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  placeholder="Ex: 45,00"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className={cn(formErrors.price && "border-destructive")}
                />
                {formErrors.price && (
                  <p className="text-sm text-destructive">{formErrors.price}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={isMutating}>
                <Save className="h-4 w-4 mr-2" />
                {createService.isPending || updateService.isPending
                  ? "Salvando..."
                  : formMode === "create"
                    ? "Criar Serviço"
                    : "Salvar Alterações"}
              </Button>
              {formMode === "edit" && (
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services List Card */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Carregando serviços...
                </span>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço cadastrado. Crie o primeiro serviço acima.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      !service.active && "opacity-60 bg-muted/50",
                      editingId === service.id && "border-primary",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{service.name}</h3>
                          <Badge
                            variant={service.active ? "default" : "secondary"}
                          >
                            {service.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Duração: {formatDuration(service.duration)}
                          </span>
                          <span className="font-medium text-primary">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(service)}
                          disabled={isMutating}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant={service.active ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => handleToggleStatus(service)}
                          disabled={isMutating}
                          className={cn(
                            service.active
                              ? "text-muted-foreground hover:text-destructive"
                              : "text-primary",
                          )}
                        >
                          {service.active ? (
                            <>
                              <ToggleRight className="h-4 w-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
