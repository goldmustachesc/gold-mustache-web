"use client";

import { Button } from "@/components/ui/button";
import type { ClientStats } from "@/types/dashboard";
import { Calendar, Plus, Scissors, Star } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
  locale: string;
  clientStats?: ClientStats | null;
}

export function QuickActions({ locale, clientStats }: QuickActionsProps) {
  const hasStats = clientStats && clientStats.totalVisits > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Novo Agendamento</h3>
            <p className="text-xs text-muted-foreground">
              Agende seu próximo horário
            </p>
          </div>
        </div>
        <Button
          asChild
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Link href={`/${locale}/agendar`}>
            <Plus className="h-4 w-4 mr-2" />
            Agendar Horário
          </Link>
        </Button>
      </div>

      {hasStats &&
        (clientStats.favoriteBarber || clientStats.favoriteService) && (
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            {clientStats.favoriteBarber && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Star className="h-3.5 w-3.5" />
                  Barbeiro favorito
                </span>
                <span className="text-foreground font-medium">
                  {clientStats.favoriteBarber.name}
                </span>
              </div>
            )}
            {clientStats.favoriteService && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5" />
                  Serviço favorito
                </span>
                <span className="text-foreground font-medium">
                  {clientStats.favoriteService.name}
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
