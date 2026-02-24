"use client";

import React from "react";
import Script from "next/script";
import { useConsent } from "@/hooks/useConsent";
import "@/types/analytics";

interface GoogleTagManagerProps {
  gtmId: string;
}

interface GTMErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for GTM components to prevent script loading errors from breaking the app
 */
class GTMErrorBoundary extends React.Component<
  { children: React.ReactNode },
  GTMErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GTMErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("GTM Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Fail silently - analytics should not break the app
    }

    return this.props.children;
  }
}

/**
 * Google Tag Manager component with LGPD-compliant consent check.
 * Only loads GTM scripts if the user has consented to analytics cookies.
 */
export function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const { hasConsent, isLoading } = useConsent();

  // Show minimal placeholder during loading to avoid layout shifts
  if (isLoading) {
    return (
      <div
        style={{
          height: "1px",
          width: "1px",
          visibility: "hidden",
        }}
        aria-hidden="true"
      />
    );
  }

  // Don't load GTM if no GTM ID or no consent
  if (!gtmId || !hasConsent("analytics")) return null;

  return (
    <GTMErrorBoundary>
      {/* Google Tag Manager - Head Script */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        onError={(e) => {
          console.warn("Failed to load Google Tag Manager:", e);
        }}
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </GTMErrorBoundary>
  );
}

/**
 * Google Tag Manager noscript fallback for body
 * This should be placed immediately after the opening <body> tag
 */
export function GoogleTagManagerNoScript({ gtmId }: { gtmId: string }) {
  const { hasConsent, isLoading } = useConsent();

  // Show minimal placeholder during loading to avoid layout shifts
  if (isLoading) {
    return (
      <div
        style={{
          height: "1px",
          width: "1px",
          visibility: "hidden",
        }}
        aria-hidden="true"
      />
    );
  }

  // Don't render noscript if no GTM ID or no consent
  if (!gtmId || !hasConsent("analytics")) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
