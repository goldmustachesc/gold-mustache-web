"use client";

import type { ClientFeatureFlags } from "@/config/feature-flags";
import { createContext, useMemo, type ReactNode } from "react";

export const FeatureFlagsContext = createContext<ClientFeatureFlags | null>(
  null,
);

export interface FeatureFlagsProviderProps {
  flags: ClientFeatureFlags;
  children: ReactNode;
}

export function FeatureFlagsProvider({
  flags,
  children,
}: FeatureFlagsProviderProps) {
  const value = useMemo(() => flags, [flags]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
