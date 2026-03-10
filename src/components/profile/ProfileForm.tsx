"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Save, User } from "lucide-react";
import { toast } from "sonner";
import { apiMutate } from "@/lib/api/client";
import type { ProfileMeData, ProfileUpdateInput } from "@/types/profile";
import { maskPhone, maskZipCode } from "@/utils/masks";

interface ProfileFormProps {
  profile: ProfileMeData | undefined;
  userEmail: string | undefined;
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileUpdateInput>({
    fullName: profile?.fullName || "",
    phone: profile?.phone ? maskPhone(profile.phone) : "",
    street: profile?.street || "",
    number: profile?.number || "",
    complement: profile?.complement || "",
    neighborhood: profile?.neighborhood || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zipCode: profile?.zipCode ? maskZipCode(profile.zipCode) : "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === "phone") {
      maskedValue = maskPhone(value);
    } else if (name === "zipCode") {
      maskedValue = maskZipCode(value);
    }

    setFormData((prev) => ({ ...prev, [name]: maskedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiMutate<unknown>("/api/profile/me", "PUT", formData);
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success(t("save.success"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("save.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.zipCode?.replace(/\D/g, "");
    if (cep && cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {
        return;
      }
    }
  };

  const inputClassName = "bg-background";
  const labelClassName = "text-sm font-medium text-foreground";
  const sectionHeaderClassName =
    "flex items-start gap-3 border-b border-border bg-muted/35 px-6 py-5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="overflow-hidden border-border bg-card shadow-none">
        <CardHeader className={sectionHeaderClassName}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">
              {t("personalInfo.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("personalInfo.description")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="email" className={labelClassName}>
              {t("personalInfo.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={userEmail || ""}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {t("personalInfo.emailHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className={labelClassName}>
              {t("personalInfo.fullName")}
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName || ""}
              onChange={handleInputChange}
              placeholder={t("personalInfo.fullNamePlaceholder")}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className={labelClassName}>
              {t("personalInfo.phone")}
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={handleInputChange}
              placeholder={t("personalInfo.phonePlaceholder")}
              maxLength={15}
              className={inputClassName}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-card shadow-none">
        <CardHeader className={sectionHeaderClassName}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{t("address.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("address.description")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode" className={labelClassName}>
                {t("address.zipCode")}
              </Label>
              <Input
                id="zipCode"
                name="zipCode"
                type="text"
                value={formData.zipCode || ""}
                onChange={handleInputChange}
                onBlur={handleCepBlur}
                placeholder={t("address.zipCodePlaceholder")}
                maxLength={9}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className={labelClassName}>
                {t("address.state")}
              </Label>
              <Input
                id="state"
                name="state"
                type="text"
                value={formData.state || ""}
                onChange={handleInputChange}
                placeholder={t("address.statePlaceholder")}
                maxLength={2}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" className={labelClassName}>
              {t("address.city")}
            </Label>
            <Input
              id="city"
              name="city"
              type="text"
              value={formData.city || ""}
              onChange={handleInputChange}
              placeholder={t("address.cityPlaceholder")}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood" className={labelClassName}>
              {t("address.neighborhood")}
            </Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              type="text"
              value={formData.neighborhood || ""}
              onChange={handleInputChange}
              placeholder={t("address.neighborhoodPlaceholder")}
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="street" className={labelClassName}>
                {t("address.street")}
              </Label>
              <Input
                id="street"
                name="street"
                type="text"
                value={formData.street || ""}
                onChange={handleInputChange}
                placeholder={t("address.streetPlaceholder")}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number" className={labelClassName}>
                {t("address.number")}
              </Label>
              <Input
                id="number"
                name="number"
                type="text"
                value={formData.number || ""}
                onChange={handleInputChange}
                placeholder={t("address.numberPlaceholder")}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement" className={labelClassName}>
              {t("address.complement")}
            </Label>
            <Input
              id="complement"
              name="complement"
              type="text"
              value={formData.complement || ""}
              onChange={handleInputChange}
              placeholder={t("address.complementPlaceholder")}
              className={inputClassName}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="h-11 w-full sm:w-auto"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("save.saving")}
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {t("save.button")}
          </>
        )}
      </Button>
    </form>
  );
}
