"use client";

import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";
import { Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { AuthCard } from "./AuthCard";

interface VerifyEmailCardProps {
  locale: string;
}

export function VerifyEmailCard({ locale }: VerifyEmailCardProps) {
  const t = useTranslations("auth.verifyEmail");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      await authService.resendConfirmationEmail(email);
      toast.success(t("resendSuccess"));
    } catch {
      toast.error(t("resendError"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthCard title={t("title")} description={t("description")}>
      <div className="flex flex-col items-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        {email && (
          <p className="text-center text-sm text-muted-foreground">
            {t("sentTo")}{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        )}

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>{t("instructions")}</p>
          <p>{t("checkSpam")}</p>
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
                {t("resending")}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("resend")}
              </>
            )}
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t("alreadyConfirmed")}{" "}
          <Link
            href={`/${locale}/login`}
            className="text-primary hover:underline"
          >
            {t("login")}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
