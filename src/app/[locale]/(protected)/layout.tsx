import { AppToaster } from "@/components/ui/app-toaster";
import { PrivateShell } from "@/components/private/PrivateShell";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  queryClient.setQueryData(["user"], user ?? null);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PrivateShell>{children}</PrivateShell>
      <AppToaster />
    </HydrationBoundary>
  );
}
