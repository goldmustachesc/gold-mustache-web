"use client";

import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { BarberDashboard } from "@/components/dashboard/BarberDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const { isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const params = useParams();
  const locale = params.locale as string;

  if (userLoading || barberLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (barberProfile) {
    return <BarberDashboard locale={locale} />;
  }

  return <ClientDashboard locale={locale} />;
}
