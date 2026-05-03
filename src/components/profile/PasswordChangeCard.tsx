"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function PasswordChangeCard() {
  const t = useTranslations("profile.password");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSuccess(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = t("validation.required");
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = t("validation.minLength");
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = t("validation.uppercase");
    } else if (!/\d/.test(formData.newPassword)) {
      newErrors.newPassword = t("validation.number");
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t("validation.mismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authService.updatePassword(formData.newPassword);
      toast.success(t("success"));
      setFormData({
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName = "bg-background pr-10";
  const labelClassName = "text-sm font-medium text-foreground";

  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-start gap-3 border-b border-border bg-muted/35 px-6 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </CardHeader>

      <CardContent className="py-6">
        {success ? (
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm text-success">{t("success")}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className={labelClassName}>
                {t("newPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder={t("newPasswordPlaceholder")}
                  className={cn(
                    inputClassName,
                    errors.newPassword && "border-destructive",
                  )}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={
                    showNewPassword
                      ? t("ariaHideNewPassword")
                      : t("ariaShowNewPassword")
                  }
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.newPassword ? (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={labelClassName}>
                {t("confirmPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder={t("confirmPasswordPlaceholder")}
                  className={cn(
                    inputClassName,
                    errors.confirmPassword && "border-destructive",
                  )}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={
                    showConfirmPassword
                      ? t("ariaHideConfirmPassword")
                      : t("ariaShowConfirmPassword")
                  }
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("changing")}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {t("button")}
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
