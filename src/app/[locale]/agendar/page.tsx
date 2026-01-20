"use client";

import { ChatBookingPage } from "@/components/booking";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Toaster } from "sonner";

export default function AgendarPage() {
  const { data: user } = useUser();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const preSelectedBarberId = searchParams.get("barbeiro") ?? undefined;

  const handleViewAppointments = () => {
    if (user) {
      router.push(`/${locale}/meus-agendamentos`);
    } else {
      router.push(`/${locale}/login?redirect=/${locale}/meus-agendamentos`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 dark:from-zinc-950 dark:via-zinc-900 dark:to-black relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent dark:from-primary/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/10 to-transparent blur-3xl dark:from-primary/5 pointer-events-none" />

      {/* Home button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
        >
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-3 pt-14 pb-4">
        <div className="w-full max-w-lg">
          <ChatBookingPage
            onViewAppointments={handleViewAppointments}
            preSelectedBarberId={preSelectedBarberId}
          />
        </div>
      </div>

      <Toaster
        position="bottom-center"
        theme="dark"
        closeButton
        toastOptions={{
          className:
            "!bg-zinc-900/95 !backdrop-blur-xl !border !border-zinc-700/50 !shadow-2xl !shadow-black/20 !rounded-xl",
          descriptionClassName: "!text-zinc-400",
          style: {
            padding: "16px",
          },
          classNames: {
            success:
              "!border-emerald-500/30 !text-emerald-50 [&>svg]:!text-emerald-400",
            error: "!border-red-500/30 !text-red-50 [&>svg]:!text-red-400",
            warning:
              "!border-amber-500/30 !text-amber-50 [&>svg]:!text-amber-400",
            info: "!border-blue-500/30 !text-blue-50 [&>svg]:!text-blue-400",
          },
        }}
      />
    </div>
  );
}
