"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface AppointmentsHeaderProps {
  locale: string;
  isLoading: boolean;
  user: { email?: string } | null;
  onSignOut: () => void;
  isSigningOut: boolean;
}

export function AppointmentsHeader({
  locale,
  isLoading,
  user,
  onSignOut,
  isSigningOut,
}: AppointmentsHeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <Image
            src="/logo.png"
            alt="Gold Mustache"
            width={36}
            height={36}
            className="rounded-full"
          />
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">Meus Agendamentos</h1>
            <p className="text-xs text-muted-foreground">
              Gold Mustache Barbearia
            </p>
          </div>
          <h1 className="sm:hidden text-lg font-semibold text-foreground">
            Meus Agendamentos
          </h1>
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div
              data-testid="auth-skeleton"
              className="h-8 w-20 bg-muted animate-pulse rounded"
            />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                disabled={isSigningOut}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Sair</span>
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/${locale}/login?redirect=/${locale}/meus-agendamentos`}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
