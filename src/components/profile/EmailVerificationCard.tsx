"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
          </div>
          {isVerified ? (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/20"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t("verified")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              {t("pending")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{t("verifiedMessage", { email: email || "" })}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {t("unverifiedWarning")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Email:{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={isLoading || !email}
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
