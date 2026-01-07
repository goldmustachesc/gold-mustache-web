"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cookie-consent";
const ANONYMOUS_ID_KEY = "cookie-anonymous-id";

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

interface ConsentState {
  preferences: ConsentPreferences;
  hasDecided: boolean;
  isLoading: boolean;
  anonymousId: string | null;
}

interface UseConsentReturn extends ConsentState {
  hasConsent: (type: "analytics" | "marketing") => boolean;
  acceptAll: () => Promise<void>;
  rejectNonEssential: () => Promise<void>;
  updatePreferences: (prefs: ConsentPreferences) => Promise<void>;
  openPreferences: () => void;
}

/**
 * Generate a UUID v4 for anonymous tracking.
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get or create anonymous ID for the current visitor.
 */
function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!anonymousId) {
    anonymousId = generateUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }
  return anonymousId;
}

/**
 * Load consent from localStorage.
 */
function loadConsent(): {
  preferences: ConsentPreferences;
  hasDecided: boolean;
} {
  if (typeof window === "undefined") {
    return {
      preferences: { analytics: false, marketing: false },
      hasDecided: false,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        preferences: {
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
        },
        hasDecided: true,
      };
    }
  } catch {
    // Invalid stored data, reset
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    preferences: { analytics: false, marketing: false },
    hasDecided: false,
  };
}

/**
 * Save consent to localStorage and optionally sync with server.
 */
async function saveConsent(
  preferences: ConsentPreferences,
  anonymousId: string | null,
): Promise<void> {
  if (typeof window === "undefined") return;

  // Save to localStorage immediately for fast access
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

  // Sync with server (fire and forget, don't block UI)
  try {
    await fetch("/api/consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analyticsConsent: preferences.analytics,
        marketingConsent: preferences.marketing,
        anonymousId,
      }),
    });
  } catch (error) {
    // Server sync failed, but localStorage is already updated
    console.warn("Failed to sync consent with server:", error);
  }
}

/**
 * Hook for managing cookie consent state.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasConsent, acceptAll, preferences } = useConsent();
 *
 *   if (hasConsent('analytics')) {
 *     // Load analytics scripts
 *   }
 * }
 * ```
 */
export function useConsent(): UseConsentReturn {
  const [state, setState] = useState<ConsentState>({
    preferences: { analytics: false, marketing: false },
    hasDecided: false,
    isLoading: true,
    anonymousId: null,
  });

  // Initialize from localStorage on mount
  useEffect(() => {
    const { preferences, hasDecided } = loadConsent();
    const anonymousId = getOrCreateAnonymousId();

    setState({
      preferences,
      hasDecided,
      isLoading: false,
      anonymousId,
    });
  }, []);

  /**
   * Check if user has consented to a specific type.
   */
  const hasConsent = useCallback(
    (type: "analytics" | "marketing"): boolean => {
      return state.hasDecided && state.preferences[type];
    },
    [state.hasDecided, state.preferences],
  );

  /**
   * Accept all cookies.
   */
  const acceptAll = useCallback(async () => {
    const newPreferences = { analytics: true, marketing: true };
    setState((prev) => ({
      ...prev,
      preferences: newPreferences,
      hasDecided: true,
    }));
    await saveConsent(newPreferences, state.anonymousId);
  }, [state.anonymousId]);

  /**
   * Reject all non-essential cookies.
   */
  const rejectNonEssential = useCallback(async () => {
    const newPreferences = { analytics: false, marketing: false };
    setState((prev) => ({
      ...prev,
      preferences: newPreferences,
      hasDecided: true,
    }));
    await saveConsent(newPreferences, state.anonymousId);
  }, [state.anonymousId]);

  /**
   * Update specific preferences.
   */
  const updatePreferences = useCallback(
    async (prefs: ConsentPreferences) => {
      setState((prev) => ({
        ...prev,
        preferences: prefs,
        hasDecided: true,
      }));
      await saveConsent(prefs, state.anonymousId);
    },
    [state.anonymousId],
  );

  /**
   * Open preferences modal (this is a placeholder - the actual modal
   * is controlled by the CookieBanner component).
   */
  const openPreferences = useCallback(() => {
    // Emit custom event that CookieBanner can listen to
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
    }
  }, []);

  return {
    ...state,
    hasConsent,
    acceptAll,
    rejectNonEssential,
    updatePreferences,
    openPreferences,
  };
}
