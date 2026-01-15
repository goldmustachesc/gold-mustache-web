"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useAdminSettings,
  useUpdateAdminSettings,
  type BarbershopSettingsResponse,
} from "@/hooks/useAdminSettings";
import {
  Building2,
  MapPin,
  Phone,
  Calendar,
  Save,
  Loader2,
  ArrowLeft,
  Menu,
  Settings,
  CheckCircle2,
  Instagram,
  Mail,
  MapPinned,
  ExternalLink,
  Info,
} from "lucide-react";
import { maskPhone } from "@/utils/masks";
import { cn } from "@/lib/utils";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";

type FormData = Omit<
  BarbershopSettingsResponse,
  "id" | "createdAt" | "updatedAt" | "latitude" | "longitude"
> & {
  latitude: number;
  longitude: number;
};

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileMe();

  const { data: settings, isLoading: settingsLoading } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  // Redirect if not admin
  useEffect(() => {
    if (!profileLoading && profile && profile.role !== "ADMIN") {
      toast.error("Acesso restrito a administradores");
      router.push(`/${locale}/dashboard`);
    }
  }, [profile, profileLoading, router, locale]);

  // Initialize form with settings data
  useEffect(() => {
    if (settings && !initialized) {
      setFormData({
        name: settings.name,
        shortName: settings.shortName,
        tagline: settings.tagline,
        description: settings.description,
        street: settings.street,
        number: settings.number,
        neighborhood: settings.neighborhood,
        city: settings.city,
        state: settings.state,
        zipCode: settings.zipCode,
        country: settings.country,
        latitude: Number(settings.latitude),
        longitude: Number(settings.longitude),
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        instagramMain: settings.instagramMain,
        instagramStore: settings.instagramStore,
        googleMapsUrl: settings.googleMapsUrl,
        bookingEnabled: settings.bookingEnabled,
        externalBookingUrl: settings.externalBookingUrl,
        foundingYear: settings.foundingYear,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const isLoading = userLoading || profileLoading || settingsLoading;

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
        <div className="text-center">
          <p className="text-red-400">Erro ao carregar perfil.</p>
          <Button
            variant="ghost"
            className="mt-4 text-amber-500"
            onClick={() => router.push(`/${locale}/dashboard`)}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== "ADMIN") {
    return null;
  }

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      await updateSettings.mutateAsync({
        name: formData.name,
        shortName: formData.shortName,
        tagline: formData.tagline,
        description: formData.description,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        instagramMain: formData.instagramMain,
        instagramStore: formData.instagramStore,
        googleMapsUrl: formData.googleMapsUrl,
        bookingEnabled: formData.bookingEnabled,
        externalBookingUrl: formData.externalBookingUrl,
        foundingYear: formData.foundingYear,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configurações",
      );
    }
  };

  if (!formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="flex flex-col items-center gap-2 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  // Calculate completion
  const completedFields = {
    empresa: [!!formData.name, !!formData.shortName, !!formData.tagline].filter(
      Boolean,
    ).length,
    endereco: [
      !!formData.street,
      !!formData.number,
      !!formData.neighborhood,
      !!formData.city,
      !!formData.state,
      !!formData.zipCode,
    ].filter(Boolean).length,
    contato: [
      !!formData.phone,
      !!formData.whatsapp,
      !!formData.email,
      !!formData.instagramMain,
    ].filter(Boolean).length,
    agendamento: [formData.bookingEnabled !== undefined].filter(Boolean).length,
  };

  const tabInfo = [
    {
      id: "empresa",
      label: "Empresa",
      icon: Building2,
      total: 3,
      completed: completedFields.empresa,
    },
    {
      id: "endereco",
      label: "Endereço",
      icon: MapPin,
      total: 6,
      completed: completedFields.endereco,
    },
    {
      id: "contato",
      label: "Contato",
      icon: Phone,
      total: 4,
      completed: completedFields.contato,
    },
    {
      id: "agendamento",
      label: "Agendamento",
      icon: Calendar,
      total: 1,
      completed: completedFields.agendamento,
    },
  ];

  const inputClassName =
    "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 h-11";
  const labelClassName = "text-zinc-300 text-sm font-medium";
  const selectClassName =
    "flex h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2";

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

            {/* Logo (desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={`/${locale}`} className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Gold Mustache"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="font-playfair text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  GOLD MUSTACHE
                </span>
              </Link>
            </div>
          </div>

          {/* Center - Title */}
          <div className="flex items-center gap-2 lg:flex-1 lg:justify-center">
            <Settings className="h-5 w-5 text-amber-500" />
            <h1 className="text-lg lg:text-xl font-bold">
              Configurações da Barbearia
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Save Button - Desktop */}
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending || !initialized}
              className="hidden lg:flex bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
            >
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Page Title - Desktop */}
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Gerenciar Configurações</h2>
          <p className="text-zinc-400 mt-1">
            Atualize as informações da sua barbearia
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Navigation & Info (Desktop) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            {/* Navigation Card */}
            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                Seções
              </h3>
              <nav className="space-y-2">
                {tabInfo.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-white"
                        : "bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon
                        className={cn(
                          "h-4 w-4",
                          activeTab === tab.id
                            ? "text-amber-500"
                            : "text-zinc-500",
                        )}
                      />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        tab.completed === tab.total
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-700 text-zinc-400",
                      )}
                    >
                      {tab.completed}/{tab.total}
                    </span>
                  </button>
                ))}
              </nav>

              {/* Info Card */}
              <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-400">
                      As alterações só serão aplicadas após clicar em "Salvar
                      Alterações".
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-6 space-y-2">
                <Link
                  href={`/${locale}/admin/barbearia/horarios`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Horários de Funcionamento
                </Link>
                <Link
                  href={`/${locale}/admin/barbearia/servicos`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Serviços
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-9">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              {/* Mobile Tabs */}
              <TabsList className="lg:hidden grid w-full grid-cols-4 bg-zinc-800/50 p-1 rounded-xl">
                <TabsTrigger
                  value="empresa"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg gap-1"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Empresa</span>
                </TabsTrigger>
                <TabsTrigger
                  value="endereco"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Endereço</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contato"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg gap-1"
                >
                  <Phone className="h-4 w-4" />
                  <span className="hidden sm:inline">Contato</span>
                </TabsTrigger>
                <TabsTrigger
                  value="agendamento"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Agendar</span>
                </TabsTrigger>
              </TabsList>

              {/* Empresa */}
              <TabsContent value="empresa" className="space-y-6">
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Dados da Empresa
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Informações básicas da barbearia
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className={labelClassName}>
                          Nome da Barbearia *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder="Ex: Gold Mustache Barbearia"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shortName" className={labelClassName}>
                          Nome Curto *
                        </Label>
                        <Input
                          id="shortName"
                          value={formData.shortName}
                          onChange={(e) =>
                            updateField("shortName", e.target.value)
                          }
                          placeholder="Ex: Gold Mustache"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tagline" className={labelClassName}>
                        Slogan
                      </Label>
                      <Input
                        id="tagline"
                        value={formData.tagline}
                        onChange={(e) => updateField("tagline", e.target.value)}
                        placeholder="Ex: Tradição e Estilo Masculino"
                        className={inputClassName}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className={labelClassName}>
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description || ""}
                        onChange={(e) =>
                          updateField("description", e.target.value || null)
                        }
                        placeholder="Descrição da barbearia para SEO e redes sociais..."
                        rows={4}
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 resize-none"
                      />
                      <p className="text-xs text-zinc-500">
                        Esta descrição será usada em SEO e compartilhamentos em
                        redes sociais
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="foundingYear" className={labelClassName}>
                        Ano de Fundação
                      </Label>
                      <Input
                        id="foundingYear"
                        type="number"
                        min={1900}
                        max={new Date().getFullYear()}
                        value={formData.foundingYear}
                        onChange={(e) =>
                          updateField("foundingYear", Number(e.target.value))
                        }
                        className={cn(inputClassName, "lg:w-40")}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
                  <h3 className="font-medium text-sm text-zinc-400 mb-4">
                    Prévia
                  </h3>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-700/50">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {formData.shortName?.charAt(0) || "G"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white">
                          {formData.name || "Nome da Barbearia"}
                        </h4>
                        <p className="text-sm text-amber-500">
                          {formData.tagline || "Slogan"}
                        </p>
                      </div>
                    </div>
                    {formData.description && (
                      <p className="mt-3 text-sm text-zinc-400 line-clamp-2">
                        {formData.description}
                      </p>
                    )}
                    {formData.foundingYear && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Desde {formData.foundingYear} •{" "}
                        {new Date().getFullYear() - formData.foundingYear} anos
                        de tradição
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Endereço */}
              <TabsContent value="endereco" className="space-y-6">
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Endereço</h2>
                      <p className="text-xs text-zinc-500">
                        Localização da barbearia
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-4">
                      <div className="lg:col-span-3 space-y-2">
                        <Label htmlFor="street" className={labelClassName}>
                          Rua *
                        </Label>
                        <Input
                          id="street"
                          value={formData.street}
                          onChange={(e) =>
                            updateField("street", e.target.value)
                          }
                          placeholder="Ex: R. 115"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number" className={labelClassName}>
                          Número *
                        </Label>
                        <Input
                          id="number"
                          value={formData.number}
                          onChange={(e) =>
                            updateField("number", e.target.value)
                          }
                          placeholder="Ex: 79"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="neighborhood"
                          className={labelClassName}
                        >
                          Bairro *
                        </Label>
                        <Input
                          id="neighborhood"
                          value={formData.neighborhood}
                          onChange={(e) =>
                            updateField("neighborhood", e.target.value)
                          }
                          placeholder="Ex: Centro"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className={labelClassName}>
                          Cidade *
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          placeholder="Ex: Itapema"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="state" className={labelClassName}>
                          Estado *
                        </Label>
                        <select
                          id="state"
                          value={formData.state}
                          onChange={(e) => updateField("state", e.target.value)}
                          className={selectClassName}
                        >
                          {BRAZILIAN_STATES.map((state) => (
                            <option
                              key={state}
                              value={state}
                              className="bg-zinc-900"
                            >
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className={labelClassName}>
                          CEP *
                        </Label>
                        <Input
                          id="zipCode"
                          value={formData.zipCode}
                          onChange={(e) =>
                            updateField("zipCode", e.target.value)
                          }
                          placeholder="Ex: 88220-000"
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coordinates Card */}
                <div className="bg-zinc-800/30 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                      <MapPinned className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Coordenadas (Google Maps)
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Para exibição no mapa
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className={labelClassName}>
                        Latitude
                      </Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) =>
                          updateField("latitude", Number(e.target.value))
                        }
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className={labelClassName}>
                        Longitude
                      </Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) =>
                          updateField("longitude", Number(e.target.value))
                        }
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Use o Google Maps para obter as coordenadas exatas
                  </p>
                </div>
              </TabsContent>

              {/* Contato */}
              <TabsContent value="contato" className="space-y-6">
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Contato</h2>
                      <p className="text-xs text-zinc-500">
                        Telefones e e-mail
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className={labelClassName}>
                          Telefone *
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            updateField("phone", maskPhone(e.target.value))
                          }
                          placeholder="Ex: 47 98904-6178"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className={labelClassName}>
                          WhatsApp *
                        </Label>
                        <Input
                          id="whatsapp"
                          value={formData.whatsapp}
                          onChange={(e) =>
                            updateField("whatsapp", e.target.value)
                          }
                          placeholder="Ex: +5547989046178"
                          className={inputClassName}
                        />
                        <p className="text-xs text-zinc-500">
                          Formato internacional com +55
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className={labelClassName}>
                        E-mail *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="Ex: contato@goldmustachebarbearia.com.br"
                          className={cn(inputClassName, "pl-10")}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media Card */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Redes Sociais</h3>
                      <p className="text-xs text-zinc-500">
                        Instagram e Google Maps
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="instagramMain"
                          className={labelClassName}
                        >
                          Instagram Principal *
                        </Label>
                        <Input
                          id="instagramMain"
                          value={formData.instagramMain}
                          onChange={(e) =>
                            updateField("instagramMain", e.target.value)
                          }
                          placeholder="Ex: @goldmustachebarbearia"
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="instagramStore"
                          className={labelClassName}
                        >
                          Instagram da Loja
                        </Label>
                        <Input
                          id="instagramStore"
                          value={formData.instagramStore || ""}
                          onChange={(e) =>
                            updateField(
                              "instagramStore",
                              e.target.value || null,
                            )
                          }
                          placeholder="Ex: @_goldlab"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="googleMapsUrl" className={labelClassName}>
                        Link do Google Maps
                      </Label>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          id="googleMapsUrl"
                          type="url"
                          value={formData.googleMapsUrl || ""}
                          onChange={(e) =>
                            updateField("googleMapsUrl", e.target.value || null)
                          }
                          placeholder="https://www.google.com/maps/..."
                          className={cn(inputClassName, "pl-10")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Agendamento */}
              <TabsContent value="agendamento" className="space-y-6">
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Configurações de Agendamento
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Controle o agendamento online
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Booking Toggle */}
                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-700/50">
                      <div className="space-y-1">
                        <div className="font-medium text-white">
                          Agendamento Online
                        </div>
                        <div className="text-sm text-zinc-400">
                          Permite que clientes agendem pelo site
                        </div>
                      </div>
                      <Switch
                        checked={formData.bookingEnabled}
                        onCheckedChange={(checked) =>
                          updateField("bookingEnabled", checked)
                        }
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="externalBookingUrl"
                        className={labelClassName}
                      >
                        URL de Agendamento Externo
                      </Label>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                          id="externalBookingUrl"
                          type="url"
                          value={formData.externalBookingUrl || ""}
                          onChange={(e) =>
                            updateField(
                              "externalBookingUrl",
                              e.target.value || null,
                            )
                          }
                          placeholder="https://chat.inbarberapp.com/..."
                          className={cn(inputClassName, "pl-10")}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Link para sistema externo (ex: Inbarber). Deixe vazio
                        para usar o agendamento interno.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div
                  className={cn(
                    "rounded-2xl p-6 border",
                    formData.bookingEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-red-500/10 border-red-500/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        formData.bookingEnabled
                          ? "bg-emerald-500/20"
                          : "bg-red-500/20",
                      )}
                    >
                      <Calendar
                        className={cn(
                          "h-5 w-5",
                          formData.bookingEnabled
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "font-semibold",
                          formData.bookingEnabled
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        {formData.bookingEnabled
                          ? "Agendamento Ativo"
                          : "Agendamento Desativado"}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {formData.bookingEnabled
                          ? formData.externalBookingUrl
                            ? "Redirecionando para sistema externo"
                            : "Clientes podem agendar pelo site"
                          : "O botão de agendamento está oculto no site"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Mobile Save Button */}
            <div className="lg:hidden mt-6">
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending || !initialized}
                className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg rounded-xl"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <BarberSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        locale={locale}
      />

      <Toaster position="top-center" richColors />
    </div>
  );
}
