export const dynamic = "force-dynamic";

import { AppToaster } from "@/components/ui/app-toaster";
import { PrivateShell } from "@/components/private/PrivateShell";
import { PROTECTED_NS } from "@/i18n/namespace-groups";
import { pickMessages } from "@/i18n/pick-messages";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient, supabase, messages] = await Promise.all([
    Promise.resolve(new QueryClient()),
    createClient(),
    getMessages(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  queryClient.setQueryData(["user"], user ?? null);

  return (
    <NextIntlClientProvider messages={pickMessages(messages, PROTECTED_NS)}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PrivateShell>{children}</PrivateShell>
        <AppToaster />
      </HydrationBoundary>
    </NextIntlClientProvider>
  );
}
