/**
 * Analytics-related type declarations
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (
      command: "config" | "event",
      targetId: string,
      config?: Record<string, unknown>,
    ) => void;
  }
}

export {};
