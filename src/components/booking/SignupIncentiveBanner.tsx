"use client";

import { Button } from "@/components/ui/button";
import { Gift, UserPlus } from "lucide-react";
import Link from "next/link";

interface SignupIncentiveBannerProps {
  variant?: "compact" | "full";
  locale: string;
}

export function SignupIncentiveBanner({
  variant = "full",
  locale,
}: SignupIncentiveBannerProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Gift className="h-5 w-5 text-primary flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Sobrancelha grátis
          </span>{" "}
          para quem criar conta!
        </p>
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link href={`/${locale}/signup`}>Criar conta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-primary/10 rounded-full">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-foreground">
            Crie sua conta e ganhe uma sobrancelha grátis!
          </h3>
          <p className="text-sm text-muted-foreground">
            Cadastre-se para acompanhar seus agendamentos, cancelar quando
            precisar e ganhar uma sobrancelha no seu próximo atendimento.
          </p>
          <Button size="sm" asChild className="mt-2">
            <Link href={`/${locale}/signup`}>
              <UserPlus className="h-4 w-4 mr-2" />
              Criar conta grátis
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
