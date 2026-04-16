export const dynamic = "force-dynamic";

import { AppToaster } from "@/components/ui/app-toaster";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AUTH_NS } from "@/i18n/namespace-groups";
import { pickMessages } from "@/i18n/pick-messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={pickMessages(messages, AUTH_NS)}>
      <div className="private-theme min-h-screen bg-background text-foreground">
        <div className="fixed right-4 top-4 z-40">
          <ThemeToggle />
        </div>
        {children}
        <AppToaster />
      </div>
    </NextIntlClientProvider>
  );
}
