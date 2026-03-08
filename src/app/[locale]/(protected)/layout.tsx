import { AppToaster } from "@/components/ui/app-toaster";
import { PrivateShell } from "@/components/private/PrivateShell";
import { QueryProvider } from "@/providers/query-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <PrivateShell>{children}</PrivateShell>
      <AppToaster />
    </QueryProvider>
  );
}
