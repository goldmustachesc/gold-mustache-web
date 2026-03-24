"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  usePrivateHeader,
  PrivateHeaderActions,
} from "@/components/private/PrivateHeaderContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useAdminFeatureFlags,
  useUpdateAdminFeatureFlags,
} from "@/hooks/useAdminFeatureFlags";
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "@/config/feature-flags";
import type { FeatureFlagSource } from "@/services/feature-flags";
import { Loader2, Save, ToggleLeft, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const FLAG_TITLES: Record<FeatureFlagKey, string> = {
  loyaltyProgram: "Programa de fidelidade",
  referralProgram: "Programa de indicação",
  eventsSection: "Seção de eventos no site",
};

function sourceLabel(source: FeatureFlagSource): string {
  switch (source) {
    case "env":
      return "Variável de ambiente";
    case "database":
      return "Banco de dados";
    case "default":
      return "Padrão do sistema";
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "product":
      return "Produto";
    case "ops":
      return "Operação";
    case "infra":
      return "Infraestrutura";
    default:
      return category;
  }
}

export function FeatureFlagsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";

  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileMe();

  const {
    data,
    isLoading: flagsLoading,
    isError: flagsError,
    error: flagsQueryError,
    refetch: refetchFlags,
  } = useAdminFeatureFlags();
  const updateFlags = useUpdateAdminFeatureFlags();

  const [draft, setDraft] = useState<Record<FeatureFlagKey, boolean> | null>(
    null,
  );

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

  useEffect(() => {
    if (!data?.flags) return;
    setDraft(
      Object.fromEntries(data.flags.map((f) => [f.key, f.enabled])) as Record<
        FeatureFlagKey,
        boolean
      >,
    );
  }, [data?.flags]);

  const flagByKey = useMemo(() => {
    if (!data?.flags) return new Map();
    return new Map(data.flags.map((f) => [f.key, f]));
  }, [data?.flags]);

  const isDirty = useMemo(() => {
    if (!data?.flags || !draft) return false;
    for (const key of FEATURE_FLAG_KEYS) {
      const f = flagByKey.get(key);
      if (!f || f.source === "env") continue;
      if (draft[key] !== f.enabled) return true;
    }
    return false;
  }, [data?.flags, draft, flagByKey]);

  const activeCount = useMemo(() => {
    if (!data?.flags) return 0;
    return data.flags.filter((f) => f.enabled).length;
  }, [data?.flags]);

  usePrivateHeader({
    title: "Feature flags",
    icon: ToggleLeft,
    backHref: `/${locale}/dashboard`,
  });

  const handleToggle = (key: FeatureFlagKey) => {
    const f = flagByKey.get(key);
    if (!f || f.source === "env" || !draft) return;
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const handleSave = async () => {
    if (!draft || !data?.flags) return;
    const flagsPayload: Partial<Record<FeatureFlagKey, boolean>> = {};
    for (const key of FEATURE_FLAG_KEYS) {
      const f = flagByKey.get(key);
      if (!f || f.source === "env") continue;
      if (draft[key] !== f.enabled) {
        flagsPayload[key] = draft[key];
      }
    }
    if (Object.keys(flagsPayload).length === 0) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    try {
      await updateFlags.mutateAsync({ flags: flagsPayload });
      toast.success("Feature flags atualizadas.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar feature flags",
      );
    }
  };

  const isLoading = userLoading || profileLoading || flagsLoading;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background">
        <p className="text-destructive">Erro ao carregar perfil.</p>
      </div>
    );
  }

  if (!profile || profile.role !== "ADMIN") {
    return null;
  }

  if (flagsError) {
    const message =
      flagsQueryError instanceof Error
        ? flagsQueryError.message
        : "Não foi possível carregar. Tente novamente em instantes.";
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card/80 p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Não foi possível carregar as feature flags
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetchFlags()}
            className="w-full sm:w-auto"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (flagsLoading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.flags || draft === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PrivateHeaderActions>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={!isDirty || updateFlags.isPending}
          onClick={() => void handleSave()}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {updateFlags.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Salvar alterações</span>
        </Button>
      </PrivateHeaderActions>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Operação
            </p>
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-foreground tracking-tight">
              Feature flags
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Ative ou desative recursos do site sem novo deploy. Quando uma
              flag está definida por variável de ambiente, ela tem prioridade
              sobre o banco de dados.
            </p>
          </header>

          <section
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/80",
              "bg-gradient-to-br from-primary/10 via-background to-muted/40",
              "backdrop-blur-sm shadow-sm",
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_55%)] pointer-events-none" />
            <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Controle de recursos
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    {activeCount} de {data.flags.length} recursos ativos no
                    momento. Alterações entram em vigor após salvar.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 border border-border/60">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Precedência: ambiente &gt; banco &gt; padrão
                </span>
              </div>
            </div>
          </section>

          <ul className="space-y-4">
            {data.flags.map((flag) => {
              const lockedByEnv = flag.source === "env";
              const title = FLAG_TITLES[flag.key] ?? flag.key;
              return (
                <li
                  key={flag.key}
                  className={cn(
                    "rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm",
                    "p-5 md:p-6 transition-shadow hover:shadow-md",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide border-border/80"
                        >
                          {categoryLabel(flag.category)}
                        </Badge>
                        <Badge
                          variant={
                            flag.source === "env"
                              ? "secondary"
                              : flag.source === "database"
                                ? "default"
                                : "outline"
                          }
                          className={cn(
                            "text-[10px] uppercase tracking-wide",
                            flag.source === "env" &&
                              "bg-warning/15 text-warning-foreground border-warning/30",
                          )}
                        >
                          {sourceLabel(flag.source)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {flag.description}
                      </p>
                      {lockedByEnv && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          Esta flag está fixada por variável de ambiente. Remova
                          a variável para permitir controle pelo painel.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 sm:pt-1">
                      <span
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          draft[flag.key]
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {draft[flag.key] ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={draft[flag.key]}
                        onCheckedChange={() => handleToggle(flag.key)}
                        disabled={lockedByEnv || updateFlags.isPending}
                        className="data-[state=checked]:bg-primary"
                        aria-label={`Alternar ${title}`}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </>
  );
}
