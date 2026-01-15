import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-center" richColors />
    </QueryProvider>
  );
}
