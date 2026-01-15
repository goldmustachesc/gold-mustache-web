"use client";

import { FloatingBookingButton } from "@/components/ui/floating-booking-button";
import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

// Rotas onde Header, Footer e botão de agendamento não devem aparecer
const PROTECTED_ROUTES = [
  "/dashboard",
  "/barbeiro",
  "/admin",
  "/profile",
  "/settings",
];

function isProtectedRoute(pathname: string): boolean {
  // Remove locale prefix (e.g., /pt-BR/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "");
  return PROTECTED_ROUTES.some((route) => pathWithoutLocale.startsWith(route));
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const hideShell = isProtectedRoute(pathname);

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingBookingButton />
    </div>
  );
}
