import { AppToaster } from "@/components/ui/app-toaster";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="private-theme min-h-screen bg-background text-foreground">
      <div className="fixed right-4 top-4 z-40">
        <ThemeToggle />
      </div>
      {children}
      <AppToaster />
    </div>
  );
}
