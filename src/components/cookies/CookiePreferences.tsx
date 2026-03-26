"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "@/hooks/useConsent";
import { X, Shield, BarChart3, Megaphone } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

interface CookiePreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CookieCategory {
  id: "essential" | "analytics" | "marketing";
  name: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

const cookieCategories: CookieCategory[] = [
  {
    id: "essential",
    name: "Cookies Essenciais",
    description:
      "Necessários para o funcionamento básico do site. Incluem autenticação, preferências de idioma e segurança. Não podem ser desativados.",
    icon: <Shield className="h-5 w-5" />,
    required: true,
  },
  {
    id: "analytics",
    name: "Cookies de Analytics",
    description:
      "Nos ajudam a entender como você usa o site, permitindo melhorar a experiência. Usamos Google Analytics para coletar dados anônimos de navegação.",
    icon: <BarChart3 className="h-5 w-5" />,
    required: false,
  },
  {
    id: "marketing",
    name: "Cookies de Marketing",
    description:
      "Utilizados para mostrar anúncios relevantes. Atualmente não utilizamos este tipo de cookie, mas esta opção está disponível para uso futuro.",
    icon: <Megaphone className="h-5 w-5" />,
    required: false,
  },
];

/**
 * Cookie preferences modal for detailed consent management.
 * Allows users to toggle individual cookie categories.
 */
export function CookiePreferences({ isOpen, onClose }: CookiePreferencesProps) {
  const locale = useLocale();
  const { preferences, updatePreferences, isLoading } = useConsent();

  const [localPreferences, setLocalPreferences] = useState({
    analytics: false,
    marketing: false,
  });

  // Sync with global preferences when they change
  useEffect(() => {
    setLocalPreferences({
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
  }, [preferences]);

  const handleToggle = (category: "analytics" | "marketing") => {
    setLocalPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    await updatePreferences(localPreferences);
    onClose();
  };

  const handleAcceptAll = async () => {
    await updatePreferences({ analytics: true, marketing: true });
    onClose();
  };

  const handleRejectAll = async () => {
    await updatePreferences({ analytics: false, marketing: false });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-labelledby="cookie-preferences-title"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2
            id="cookie-preferences-title"
            className="text-lg font-semibold text-foreground"
          >
            Preferências de Cookies
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Gerencie suas preferências de cookies. Cookies essenciais são
            necessários para o funcionamento do site e não podem ser
            desativados. Para mais informações, consulte nossa{" "}
            <Link
              href={`/${locale}/politica-de-privacidade`}
              className="text-primary underline hover:text-primary/80"
            >
              Política de Privacidade
            </Link>
            .
          </p>

          <div className="space-y-4">
            {cookieCategories.map((category) => (
              <div
                key={category.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-primary">{category.icon}</div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {category.required ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        Sempre ativo
                      </span>
                    ) : (
                      <Switch
                        checked={
                          category.id === "analytics"
                            ? localPreferences.analytics
                            : localPreferences.marketing
                        }
                        onCheckedChange={() =>
                          handleToggle(category.id as "analytics" | "marketing")
                        }
                        disabled={isLoading}
                        aria-label={`${localPreferences[category.id as "analytics" | "marketing"] ? "Desativar" : "Ativar"} ${category.name}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              disabled={isLoading}
            >
              Rejeitar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
              disabled={isLoading}
            >
              Aceitar todos
            </Button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            Salvar preferências
          </Button>
        </div>
      </div>
    </div>
  );
}
