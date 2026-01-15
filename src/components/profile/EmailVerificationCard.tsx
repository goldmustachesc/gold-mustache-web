"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, Loader2, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";

interface EmailVerificationCardProps {
  email: string | undefined;
  isVerified: boolean;
}

export function EmailVerificationCard({
  email,
  isVerified,
}: EmailVerificationCardProps) {
  const t = useTranslations("profile.emailVerification");
  const [isLoading, setIsLoading] = useState(false);

  const handleResendVerification = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      await authService.resendConfirmationEmail(email);
      toast.success(t("success"));
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
      <div className="p-4 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Mail className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{t("title")}</h3>
            <p className="text-sm text-zinc-400">{t("description")}</p>
          </div>
        </div>
        {isVerified ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("verified")}
          </Badge>
        ) : (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Clock className="mr-1 h-3 w-3" />
            {t("pending")}
          </Badge>
        )}
      </div>
      <div className="p-5">
        {isVerified ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{t("verifiedMessage", { email: email || "" })}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400">{t("unverifiedWarning")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1">
                <p className="text-sm text-zinc-400">
                  Email: <span className="font-medium text-white">{email}</span>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={isLoading || !email}
                className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("sendButton")}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-zinc-500">{t("hint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
