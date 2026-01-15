"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Info,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Save,
  Scissors,
  Settings,
  Tag,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-red-400">Erro ao carregar perfil.</p>
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
    // Scroll to form on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Calculate stats
  const activeServices = services.filter((s) => s.active);
  const inactiveServices = services.filter((s) => !s.active);
  const avgPrice =
    activeServices.length > 0
      ? activeServices.reduce((acc, s) => acc + s.price, 0) /
        activeServices.length
      : 0;
  const avgDuration =
    activeServices.length > 0
      ? Math.round(
          activeServices.reduce((acc, s) => acc + s.duration, 0) /
            activeServices.length,
        )
      : 0;

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Image
                src="/logo.png"
                alt="Gold Mustache"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                  Serviços da Barbearia
                </h1>
                <p className="text-sm text-zinc-400">
                  {activeServices.length} serviços ativos
                </p>
              </div>
            </div>

            {formMode === "edit" && (
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Edição
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block lg:w-3/12 space-y-4">
              {/* Stats Card */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Resumo dos Serviços
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Ativos</span>
                    <span className="font-semibold text-green-400">
                      {activeServices.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Inativos</span>
                    <span className="font-semibold text-zinc-500">
                      {inactiveServices.length}
                    </span>
                  </div>
                  <div className="border-t border-zinc-700/50 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Preço médio</span>
                      <span className="font-semibold text-amber-400">
                        {formatPrice(avgPrice)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Duração média</span>
                    <span className="font-semibold text-amber-400">
                      {formatDuration(avgDuration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">
                  Outras Configurações
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() =>
                      router.push(`/${locale}/admin/barbearia/horarios`)
                    }
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Horários
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() =>
                      router.push(`/${locale}/admin/barbearia/configuracoes`)
                    }
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    onClick={() => router.push(`/${locale}/admin/barbeiros`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Barbeiros
                  </Button>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 rounded-xl border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">
                      Dica
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Serviços inativos não aparecem para os clientes no
                      agendamento, mas o histórico é mantido.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:w-9/12 space-y-6">
              {/* Form Card */}
              <div
                className={cn(
                  "bg-zinc-800/50 rounded-xl border p-5 transition-all",
                  formMode === "edit"
                    ? "border-amber-500/50 shadow-lg shadow-amber-500/5"
                    : "border-zinc-700/50",
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  {formMode === "create" ? (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-black" />
                      </div>
                      <h2 className="font-semibold text-white">Novo Serviço</h2>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Pencil className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="font-semibold text-white">
                        Editar Serviço
                      </h2>
                    </>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm text-zinc-400 flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      Nome *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ex: Corte Masculino"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className={cn(
                        "bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20",
                        formErrors.name && "border-red-500/50",
                      )}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-red-400">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm text-zinc-400"
                    >
                      Descrição (opcional)
                    </Label>
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
                      className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="duration"
                      className="text-sm text-zinc-400 flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Duração *
                    </Label>
                    <Select
                      value={String(form.duration)}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          duration: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-700/50 text-white focus:border-amber-500/50 focus:ring-amber-500/20">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={String(opt.value)}
                            className="text-white hover:bg-zinc-700 focus:bg-zinc-700"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="price"
                      className="text-sm text-zinc-400 flex items-center gap-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      Preço (R$) *
                    </Label>
                    <Input
                      id="price"
                      placeholder="Ex: 45,00"
                      value={form.price}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value }))
                      }
                      className={cn(
                        "bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/20",
                        formErrors.price && "border-red-500/50",
                      )}
                    />
                    {formErrors.price && (
                      <p className="text-sm text-red-400">{formErrors.price}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={isMutating}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
                  >
                    {createService.isPending || updateService.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {formMode === "create"
                          ? "Criar Serviço"
                          : "Salvar Alterações"}
                      </>
                    )}
                  </Button>
                  {formMode === "edit" && (
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 lg:hidden"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {/* Mobile Stats */}
              <div className="lg:hidden bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {activeServices.length}
                      </div>
                      <div className="text-xs text-zinc-400">Ativos</div>
                    </div>
                    <div className="w-px h-8 bg-zinc-700" />
                    <div className="text-center">
                      <div className="text-lg font-bold text-zinc-500">
                        {inactiveServices.length}
                      </div>
                      <div className="text-xs text-zinc-400">Inativos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-400">
                      {formatPrice(avgPrice)}
                    </div>
                    <div className="text-xs text-zinc-400">Preço médio</div>
                  </div>
                </div>
              </div>

              {/* Services List */}
              <div className="space-y-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-amber-500" />
                  Serviços Cadastrados
                </h2>

                {servicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    <span className="ml-2 text-zinc-400">
                      Carregando serviços...
                    </span>
                  </div>
                ) : services.length === 0 ? (
                  <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-8 text-center">
                    <Scissors className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">Nenhum serviço cadastrado.</p>
                    <p className="text-zinc-500 text-sm">
                      Crie o primeiro serviço usando o formulário acima.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className={cn(
                          "rounded-xl border p-4 transition-all duration-200",
                          service.active
                            ? "bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/50"
                            : "bg-zinc-900/50 border-zinc-800/50 opacity-60",
                          editingId === service.id &&
                            "border-amber-500/50 bg-amber-500/5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-white truncate">
                                {service.name}
                              </h3>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  service.active
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-zinc-700/50 text-zinc-500 border-zinc-600/30",
                                )}
                              >
                                {service.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            {service.description && (
                              <p className="text-sm text-zinc-400 mb-2 line-clamp-1">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1 text-zinc-400">
                                <Clock className="h-3 w-3" />
                                {formatDuration(service.duration)}
                              </span>
                              <span className="font-semibold text-amber-400">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(service)}
                            disabled={isMutating}
                            className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(service)}
                            disabled={isMutating}
                            className={cn(
                              "flex-1",
                              service.active
                                ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                : "text-zinc-400 hover:text-green-400 hover:bg-green-500/10",
                            )}
                          >
                            {service.active ? (
                              <>
                                <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
                                Ativar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
