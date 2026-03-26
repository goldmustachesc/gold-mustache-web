"use client";

import type { ClientFeatureFlags } from "@/config/feature-flags";
import { FeatureFlagsContext } from "@/providers/feature-flags-provider";
import { useContext } from "react";

export function useFeatureFlags(): ClientFeatureFlags {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }

  return context;
}
