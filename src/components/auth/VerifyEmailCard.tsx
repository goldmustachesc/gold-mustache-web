"use client";

import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";
import { Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "./AuthCard";

interface VerifyEmailCardProps {
  locale: string;
}

export function VerifyEmailCard({ locale }: VerifyEmailCardProps) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      await authService.resendConfirmationEmail(email);
      toast.success("Email reenviado com sucesso!");
    } catch {
      toast.error("Erro ao reenviar email. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard
      title="Verifique seu email"
      description="Enviamos um link de confirmação para seu email"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        {email && (
          <p className="text-center text-sm text-muted-foreground">
            Enviamos um email para{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        )}

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>Clique no link do email para ativar sua conta.</p>
          <p>Verifique também a pasta de spam.</p>
        </div>

        {email && (
          <Button
            variant="outline"
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reenviando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reenviar email
              </>
            )}
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Já confirmou?{" "}
          <Link
            href={`/${locale}/login`}
            className="text-primary hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
