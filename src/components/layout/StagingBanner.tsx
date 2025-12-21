"use client";

import { siteConfig } from "@/config/site";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/**
 * Banner que aparece apenas em ambientes não-produção
 * para indicar visualmente que é um ambiente de staging/development
 */
export function StagingBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  // Não renderizar em produção ou se foi fechado
  if (siteConfig.isProduction || isDismissed) {
    return null;
  }

  const environmentLabel =
    siteConfig.environment === "staging" ? "STAGING" : "DEVELOPMENT";

  const environmentColor =
    siteConfig.environment === "staging"
      ? "bg-amber-500/90 text-amber-950"
      : "bg-blue-500/90 text-blue-950";

  return (
    <div
      className={`${environmentColor} relative z-[100] px-4 py-2 text-center text-sm font-semibold`}
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Ambiente de <strong>{environmentLabel}</strong> — Este não é o site de
          produção
        </span>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute right-4 rounded-full p-1 transition-colors hover:bg-black/10"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
