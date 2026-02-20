import { AppToaster } from "@/components/ui/app-toaster";
import { QueryProvider } from "@/providers/query-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="private-theme min-h-screen bg-background text-foreground">
        {children}
      </div>
      <AppToaster />
    </QueryProvider>
  );
}
