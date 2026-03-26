"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CookiePreferences } from "./CookiePreferences";
import { useConsent } from "@/hooks/useConsent";
import { Cookie, Settings, X } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

/**
 * Cookie consent banner component for LGPD compliance.
 * Shows on first visit and allows users to accept, reject, or customize preferences.
 */
export function CookieBanner() {
  const locale = useLocale();
  const { hasDecided, acceptAll, rejectNonEssential, isLoading } = useConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Show banner only after checking consent status
  useEffect(() => {
    if (!isLoading && !hasDecided) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasDecided]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  const handleAcceptAll = async () => {
    await acceptAll();
    handleClose();
  };

  const handleRejectNonEssential = async () => {
    await rejectNonEssential();
    handleClose();
  };

  const handleOpenPreferences = () => {
    setShowPreferences(true);
  };

  const handleClosePreferences = () => {
    setShowPreferences(false);
    handleClose();
  };

  // Don't render if already decided or still loading
  if (isLoading || hasDecided || !isVisible) {
    // Still render preferences modal if open
    if (showPreferences) {
      return (
        <CookiePreferences
          isOpen={showPreferences}
          onClose={handleClosePreferences}
        />
      );
    }
    return null;
  }

  return (
    <>
      {/* Cookie Preferences Modal */}
      <CookiePreferences
        isOpen={showPreferences}
        onClose={handleClosePreferences}
      />

      {/* Cookie Banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-300 ${
          isClosing ? "translate-y-full" : "translate-y-0"
        }`}
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="hidden sm:block">
                <Cookie className="h-8 w-8 text-primary" />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h2
                    id="cookie-banner-title"
                    className="text-lg font-semibold text-foreground"
                  >
                    Nós usamos cookies
                  </h2>
                  <p
                    id="cookie-banner-description"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    Utilizamos cookies para melhorar sua experiência no site e
                    analisar o tráfego. Você pode escolher quais cookies
                    aceitar. Saiba mais em nossa{" "}
                    <Link
                      href={`/${locale}/politica-de-privacidade`}
                      className="text-primary underline hover:text-primary/80"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    onClick={handleAcceptAll}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    Aceitar todos
                  </Button>
                  <Button
                    onClick={handleRejectNonEssential}
                    variant="outline"
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    Apenas essenciais
                  </Button>
                  <Button
                    onClick={handleOpenPreferences}
                    variant="ghost"
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Personalizar
                  </Button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar e aceitar apenas essenciais"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
