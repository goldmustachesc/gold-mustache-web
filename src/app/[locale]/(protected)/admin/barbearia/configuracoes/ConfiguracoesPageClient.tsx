"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings,
  CheckCircle2,
  Instagram,
  Mail,
  MapPinned,
  ExternalLink,
  Info,
  Star,
} from "lucide-react";
import { maskPhone } from "@/utils/masks";
import { cn } from "@/lib/utils";
import { mobileStickyOffsetClassName } from "@/components/private/mobile-nav-layout";

type FormData = Omit<
  BarbershopSettingsResponse,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "latitude"
  | "longitude"
  | "featuredOriginalPrice"
  | "featuredDiscountedPrice"
> & {
  latitude: number;
  longitude: number;
  featuredOriginalPrice: number;
  featuredDiscountedPrice: number;
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

export function ConfiguracoesPageClient() {
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: settings, isLoading: settingsLoading } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");

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
        featuredEnabled: settings.featuredEnabled,
        featuredBadge: settings.featuredBadge,
        featuredTitle: settings.featuredTitle,
        featuredDescription: settings.featuredDescription,
        featuredDuration: settings.featuredDuration,
        featuredOriginalPrice: Number(settings.featuredOriginalPrice),
        featuredDiscountedPrice: Number(settings.featuredDiscountedPrice),
        foundingYear: settings.foundingYear,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

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
        featuredEnabled: formData.featuredEnabled,
        featuredBadge: formData.featuredBadge,
        featuredTitle: formData.featuredTitle,
        featuredDescription: formData.featuredDescription,
        featuredDuration: formData.featuredDuration,
        featuredOriginalPrice: Number(formData.featuredOriginalPrice),
        featuredDiscountedPrice: Number(formData.featuredDiscountedPrice),
        foundingYear: formData.foundingYear,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configurações",
      );
    }
  };

  usePrivateHeader({
    title: "Dados da Barbearia",
    icon: Building2,
    backHref: `/${locale}/dashboard`,
  });

  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  if (!formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

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
    destaque: [
      !!formData.featuredBadge,
      !!formData.featuredTitle,
      !!formData.featuredDescription,
      !!formData.featuredDuration,
      Number(formData.featuredOriginalPrice) > 0,
      Number(formData.featuredDiscountedPrice) > 0,
    ].filter(Boolean).length,
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
    {
      id: "destaque",
      label: "Destaque",
      icon: Star,
      total: 6,
      completed: completedFields.destaque,
    },
  ];

  const inputClassName =
    "bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11";
  const labelClassName = "text-foreground text-sm font-medium";
  const selectClassName =
    "flex h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  return (
    <div>
      <PrivateHeaderActions>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending || !initialized}
          className="hidden lg:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold"
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
      </PrivateHeaderActions>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Gerenciar Configurações</h2>
          <p className="text-muted-foreground mt-1">
            Atualize as informações da sua barbearia
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="bg-card/30 rounded-2xl p-6 border border-border sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
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
                        ? "bg-gradient-to-r from-primary/20 to-primary/20 border border-primary/30 text-foreground"
                        : "bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon
                        className={cn(
                          "h-4 w-4",
                          activeTab === tab.id
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        tab.completed === tab.total
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.completed}/{tab.total}
                    </span>
                  </button>
                ))}
              </nav>

              <div className="mt-6 p-4 bg-background/50 rounded-xl border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      As alterações só serão aplicadas após clicar em
                      &quot;Salvar Alterações&quot;.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  href={`/${locale}/admin/barbearia/horarios`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Horários de Funcionamento
                </Link>
                <Link
                  href={`/${locale}/admin/barbearia/servicos`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Serviços
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="lg:hidden grid w-full grid-cols-5 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger
                  value="empresa"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-foreground rounded-lg gap-1"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    Empresa
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="endereco"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-foreground rounded-lg gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    Endereço
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="contato"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-foreground rounded-lg gap-1"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    Contato
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="agendamento"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-foreground rounded-lg gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    Agendar
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="destaque"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-foreground rounded-lg gap-1"
                >
                  <Star className="h-4 w-4" />
                  <span className="text-xs sm:text-sm hidden sm:inline">
                    Destaque
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="empresa" className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Dados da Empresa
                      </h2>
                      <p className="text-xs text-muted-foreground">
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
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
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

                <div className="bg-card/30 rounded-2xl p-6 border border-border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-4">
                    Prévia
                  </h3>
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <span className="text-foreground font-bold text-lg">
                          {formData.shortName?.charAt(0) || "G"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">
                          {formData.name || "Nome da Barbearia"}
                        </h4>
                        <p className="text-sm text-primary">
                          {formData.tagline || "Slogan"}
                        </p>
                      </div>
                    </div>
                    {formData.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {formData.description}
                      </p>
                    )}
                    {formData.foundingYear && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Desde {formData.foundingYear} •{" "}
                        {new Date().getFullYear() - formData.foundingYear} anos
                        de tradição
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Endereço</h2>
                      <p className="text-xs text-muted-foreground">
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
                              className="bg-background"
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

                <div className="bg-card/30 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      <MapPinned className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Coordenadas (Google Maps)
                      </h3>
                      <p className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Use o Google Maps para obter as coordenadas exatas
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Contato</h2>
                      <p className="text-xs text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground">
                          Formato internacional com +55
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className={labelClassName}>
                        E-mail *
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Redes Sociais</h3>
                      <p className="text-xs text-muted-foreground">
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
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

              <TabsContent value="agendamento" className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Configurações de Agendamento
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Controle o agendamento online
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          Agendamento Online
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Permite que clientes agendem pelo site
                        </div>
                      </div>
                      <Switch
                        checked={formData.bookingEnabled}
                        onCheckedChange={(checked) =>
                          updateField("bookingEnabled", checked)
                        }
                        className="data-[state=checked]:bg-primary"
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
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Link para sistema externo (ex: Inbarber). Deixe vazio
                        para usar o agendamento interno.
                      </p>
                    </div>
                  </div>
                </div>

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
                      <p className="text-sm text-muted-foreground">
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

              <TabsContent value="destaque" className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Serviço em Destaque
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Card promocional exibido na página inicial
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          Exibir Destaque
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Mostra o card promocional na seção de serviços
                        </div>
                      </div>
                      <Switch
                        checked={formData.featuredEnabled}
                        onCheckedChange={(checked) =>
                          updateField("featuredEnabled", checked)
                        }
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="featuredBadge"
                          className={labelClassName}
                        >
                          Badge *
                        </Label>
                        <Input
                          id="featuredBadge"
                          value={formData.featuredBadge}
                          onChange={(e) =>
                            updateField("featuredBadge", e.target.value)
                          }
                          placeholder="Ex: Mais Popular"
                          className={inputClassName}
                        />
                        <p className="text-xs text-muted-foreground">
                          Texto exibido no selo do card
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="featuredTitle"
                          className={labelClassName}
                        >
                          Título *
                        </Label>
                        <Input
                          id="featuredTitle"
                          value={formData.featuredTitle}
                          onChange={(e) =>
                            updateField("featuredTitle", e.target.value)
                          }
                          placeholder="Ex: Combo Completo"
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="featuredDescription"
                        className={labelClassName}
                      >
                        Descrição *
                      </Label>
                      <Textarea
                        id="featuredDescription"
                        value={formData.featuredDescription}
                        onChange={(e) =>
                          updateField("featuredDescription", e.target.value)
                        }
                        placeholder="Ex: Corte + Barba + Sobrancelha - O pacote completo para um visual impecável"
                        rows={2}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="featuredDuration"
                        className={labelClassName}
                      >
                        Duração *
                      </Label>
                      <Input
                        id="featuredDuration"
                        value={formData.featuredDuration}
                        onChange={(e) =>
                          updateField("featuredDuration", e.target.value)
                        }
                        placeholder="Ex: Aproximadamente 60 minutos"
                        className={inputClassName}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="featuredOriginalPrice"
                          className={labelClassName}
                        >
                          Preço Original (De) *
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <Input
                            id="featuredOriginalPrice"
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.featuredOriginalPrice}
                            onChange={(e) =>
                              updateField(
                                "featuredOriginalPrice",
                                e.target.valueAsNumber || 0,
                              )
                            }
                            placeholder="115.00"
                            className={cn(inputClassName, "pl-10")}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Preço riscado (valor &quot;de&quot;)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="featuredDiscountedPrice"
                          className={labelClassName}
                        >
                          Preço Promocional (Por) *
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <Input
                            id="featuredDiscountedPrice"
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.featuredDiscountedPrice}
                            onChange={(e) =>
                              updateField(
                                "featuredDiscountedPrice",
                                e.target.valueAsNumber || 0,
                              )
                            }
                            placeholder="100.00"
                            className={cn(inputClassName, "pl-10")}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Preço em destaque (valor &quot;por&quot;)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-card/30 rounded-2xl p-6 border border-border">
                  <h3 className="font-medium text-sm text-muted-foreground mb-4">
                    Prévia do Card
                  </h3>
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium mb-3">
                        <Star className="h-3 w-3" />
                        {formData.featuredBadge || "Badge"}
                      </span>
                      <h4 className="text-xl font-bold mb-2">
                        {formData.featuredTitle || "Título do Serviço"}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {formData.featuredDescription || "Descrição do serviço"}
                      </p>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <span className="text-muted-foreground line-through">
                          R${" "}
                          {Number(formData.featuredOriginalPrice || 0).toFixed(
                            2,
                          )}
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          R${" "}
                          {Number(
                            formData.featuredDiscountedPrice || 0,
                          ).toFixed(2)}
                        </span>
                        {Number(formData.featuredOriginalPrice) >
                          Number(formData.featuredDiscountedPrice) && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-medium">
                            Economize R${" "}
                            {(
                              Number(formData.featuredOriginalPrice) -
                              Number(formData.featuredDiscountedPrice)
                            ).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.featuredDuration || "Duração"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-2xl p-6 border",
                    formData.featuredEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-amber-500/10 border-amber-500/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        formData.featuredEnabled
                          ? "bg-emerald-500/20"
                          : "bg-amber-500/20",
                      )}
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          formData.featuredEnabled
                            ? "text-emerald-400"
                            : "text-amber-400",
                        )}
                      />
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "font-semibold",
                          formData.featuredEnabled
                            ? "text-emerald-400"
                            : "text-amber-400",
                        )}
                      >
                        {formData.featuredEnabled
                          ? "Destaque Ativo"
                          : "Destaque Desativado"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.featuredEnabled
                          ? "O card promocional está visível na página inicial"
                          : "O card promocional está oculto na página inicial"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div
              className={cn(
                "lg:hidden sticky z-10 py-4 bg-background/95 backdrop-blur-sm border-t border-border",
                mobileStickyOffsetClassName,
              )}
            >
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending || !initialized}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
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
    </div>
  );
}
