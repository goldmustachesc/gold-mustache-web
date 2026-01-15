"use client";

import { FloatingBookingButton } from "@/components/ui/floating-booking-button";
import { usePathname } from "next/navigation";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

// Rotas onde Header, Footer e botão de agendamento não devem aparecer (dashboards/áreas protegidas)
const PROTECTED_ROUTES = [
  "/dashboard",
  "/barbeiro",
  "/admin",
  "/profile",
  "/settings",
  "/meus-agendamentos",
  "/login",
  "/signup",
  "/reset-password",
  "/verify-email",
  "/agendar",
];

function getPathnameWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "");
}

function isProtectedRoute(pathname: string): boolean {
  const pathWithoutLocale = getPathnameWithoutLocale(pathname);
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
