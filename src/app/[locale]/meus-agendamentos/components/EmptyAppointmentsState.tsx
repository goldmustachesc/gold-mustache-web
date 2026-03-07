"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";

interface EmptyAppointmentsStateProps {
  locale: string;
}

export function EmptyAppointmentsState({
  locale,
}: EmptyAppointmentsStateProps) {
  return (
    <div className="text-center py-16 space-y-6">
      <div className="p-6 bg-muted/50 rounded-full w-fit mx-auto">
        <Calendar className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-foreground font-playfair">
          Nenhum agendamento ainda
        </h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Você ainda não tem agendamentos. Que tal marcar seu primeiro horário?
        </p>
      </div>
      <Button
        asChild
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Link href={`/${locale}/agendar`}>
          <Plus className="h-4 w-4 mr-2" />
          Agendar Horário
        </Link>
      </Button>
    </div>
  );
}
