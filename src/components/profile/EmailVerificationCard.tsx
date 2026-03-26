"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Loader2, Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const tProfile = useTranslations("profile");
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
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border bg-muted/35 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        {isVerified ? (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("verified")}
          </Badge>
        ) : (
          <Badge variant="warning">
            <Clock className="mr-1 h-3 w-3" />
            {t("pending")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="py-6">
        {isVerified ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t("verifiedMessage", { email: email || "" })}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
              <p className="text-sm text-warning">{t("unverifiedWarning")}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {tProfile("personalInfo.email")}:{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={isLoading || !email}
                className="w-full sm:w-auto"
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

            <p className="text-xs text-muted-foreground">{t("hint")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
