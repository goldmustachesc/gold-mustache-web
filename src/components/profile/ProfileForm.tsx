"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, MapPin, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { ProfileMeData, ProfileUpdateInput } from "@/types/profile";

interface ProfileFormProps {
  profile: ProfileMeData | undefined;
  userEmail: string | undefined;
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("profile");
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProfileUpdateInput>({
    fullName: profile?.fullName || "",
    phone: profile?.phone || "",
    street: profile?.street || "",
    number: profile?.number || "",
    complement: profile?.complement || "",
    neighborhood: profile?.neighborhood || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zipCode: profile?.zipCode || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar perfil");
      }

      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success(t("save.success"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("save.error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CEP lookup (Brazil specific)
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
        // Silently fail - user can still enter address manually
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("personalInfo.title")}</CardTitle>
              <CardDescription>{t("personalInfo.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("personalInfo.email")}</Label>
            <Input
              id="email"
              type="email"
              value={userEmail || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t("personalInfo.emailHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">{t("personalInfo.fullName")}</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName || ""}
              onChange={handleInputChange}
              placeholder={t("personalInfo.fullNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("personalInfo.phone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={handleInputChange}
              placeholder={t("personalInfo.phonePlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("address.title")}</CardTitle>
              <CardDescription>{t("address.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">{t("address.zipCode")}</Label>
              <Input
                id="zipCode"
                name="zipCode"
                type="text"
                value={formData.zipCode || ""}
                onChange={handleInputChange}
                onBlur={handleCepBlur}
                placeholder={t("address.zipCodePlaceholder")}
                maxLength={9}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t("address.state")}</Label>
              <Input
                id="state"
                name="state"
                type="text"
                value={formData.state || ""}
                onChange={handleInputChange}
                placeholder={t("address.statePlaceholder")}
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t("address.city")}</Label>
            <Input
              id="city"
              name="city"
              type="text"
              value={formData.city || ""}
              onChange={handleInputChange}
              placeholder={t("address.cityPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood">{t("address.neighborhood")}</Label>
            <Input
              id="neighborhood"
              name="neighborhood"
              type="text"
              value={formData.neighborhood || ""}
              onChange={handleInputChange}
              placeholder={t("address.neighborhoodPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="street">{t("address.street")}</Label>
              <Input
                id="street"
                name="street"
                type="text"
                value={formData.street || ""}
                onChange={handleInputChange}
                placeholder={t("address.streetPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">{t("address.number")}</Label>
              <Input
                id="number"
                name="number"
                type="text"
                value={formData.number || ""}
                onChange={handleInputChange}
                placeholder={t("address.numberPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complement">{t("address.complement")}</Label>
            <Input
              id="complement"
              name="complement"
              type="text"
              value={formData.complement || ""}
              onChange={handleInputChange}
              placeholder={t("address.complementPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
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
