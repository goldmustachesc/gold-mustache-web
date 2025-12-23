"use client";

import { ChatBookingPage } from "@/components/booking";
import { Button } from "@/components/ui/button";
import { useSignOut, useUser } from "@/hooks/useAuth";
import { Scissors, LogOut, LogIn } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "sonner";

function AgendarContent() {
  const { data: user, isLoading } = useUser();
  const { mutate: signOut, isPending } = useSignOut();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleViewAppointments = () => {
    if (user) {
      router.push(`/${locale}/meus-agendamentos`);
    } else {
      router.push(`/${locale}/login?redirect=/${locale}/meus-agendamentos`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Gold Mustache</h1>
          </Link>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  disabled={isPending}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sair</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/login?redirect=/${locale}/agendar`}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <ChatBookingPage onViewAppointments={handleViewAppointments} />
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function AgendarPage() {
  return (
    <QueryProvider>
      <AgendarContent />
    </QueryProvider>
  );
}
