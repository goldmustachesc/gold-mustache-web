import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/analytics/GoogleTagManager";
import { StagingBanner } from "@/components/layout/StagingBanner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SchemaMarkup } from "@/components/seo/SchemaMarkup";
import { LoadingElevatorWrapper } from "@/components/ui/loading-elevator-wrapper";
import { barbershopConfig } from "@/config/barbershop";
import { locales } from "@/i18n/config";
import { SHARED_NS } from "@/i18n/namespace-groups";
import { pickMessages } from "@/i18n/pick-messages";
import { QueryProvider } from "@/providers/query-provider";
import { FeatureFlagsProvider } from "@/providers/feature-flags-provider";
import { BookingSettingsProvider } from "@/providers/booking-settings-provider";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { getClientFeatureFlags } from "@/services/feature-flags";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const baseUrl = "https://www.goldmustachebarbearia.com.br";

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    authors: [
      {
        name: "Gold Mustache Barbearia",
        url: baseUrl,
      },
    ],
    creator: "Gold Mustache Barbearia",
    publisher: "Gold Mustache Barbearia",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "pt-BR": "/pt-BR",
        es: "/es",
        en: "/en",
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        {
          url: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180" },
        { url: "/apple-touch-icon-152x152.png", sizes: "152x152" },
        { url: "/apple-touch-icon-144x144.png", sizes: "144x144" },
        { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
        { url: "/apple-touch-icon-114x114.png", sizes: "114x114" },
        { url: "/apple-touch-icon-76x76.png", sizes: "76x76" },
        { url: "/apple-touch-icon-72x72.png", sizes: "72x72" },
        { url: "/apple-touch-icon-60x60.png", sizes: "60x60" },
        { url: "/apple-touch-icon-57x57.png", sizes: "57x57" },
      ],
      shortcut: "/favicon.ico",
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: t("og.title"),
      description: t("og.description"),
      url: `${baseUrl}/${locale}`,
      siteName: t("og.siteName"),
      images: [
        {
          url: `${baseUrl}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Gold Mustache Barbearia - Itapema SC",
          type: "image/png",
        },
        {
          url: "/logo.png",
          width: 800,
          height: 800,
          alt: "Gold Mustache Logo",
          type: "image/png",
        },
      ],
      locale: locale === "pt-BR" ? "pt_BR" : locale,
      type: "website",
      countryName: "Brazil",
      emails: ["ygor.dagger12@gmail.com"],
      phoneNumbers: ["+55 47 98840-1893"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitter.title"),
      description: t("twitter.description"),
      images: [`${baseUrl}/${locale}/twitter-image`],
      creator: "@goldmustachebarbearia",
      site: "@goldmustachebarbearia",
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "apple-mobile-web-app-title": "Gold Mustache",
      "application-name": "Gold Mustache Barbearia",
      "msapplication-TileColor": "#ffffff",
      "msapplication-TileImage": "/mstile-144x144.png",
      "msapplication-config": "/browserconfig.xml",
      "theme-color": "#ffffff",
    },
    verification: {
      google: "googlecd1c0babcbe059f0.html",
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const [messages, settings, clientFeatureFlags] = await Promise.all([
    getMessages(),
    getBarbershopSettings(),
    getClientFeatureFlags(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          as="image"
          href="/images/interno/interno-01.webp"
          fetchPriority="high"
        />
        <SchemaMarkup />
        <GoogleTagManager
          gtmId={barbershopConfig.analytics.googleTagManagerId || ""}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        <GoogleTagManagerNoScript
          gtmId={barbershopConfig.analytics.googleTagManagerId || ""}
        />
        <GoogleAnalytics
          trackingId={barbershopConfig.analytics.googleAnalyticsId}
        />
        <LoadingElevatorWrapper />
        <NextIntlClientProvider messages={pickMessages(messages, SHARED_NS)}>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <FeatureFlagsProvider flags={clientFeatureFlags}>
                <BookingSettingsProvider
                  bookingEnabled={settings.bookingEnabled}
                  externalBookingUrl={settings.externalBookingUrl}
                  locale={locale}
                >
                  <StagingBanner />
                  {children}
                </BookingSettingsProvider>
              </FeatureFlagsProvider>
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
