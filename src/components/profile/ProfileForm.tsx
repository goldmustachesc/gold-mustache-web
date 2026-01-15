"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, MapPin, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { ProfileMeData, ProfileUpdateInput } from "@/types/profile";
import { maskPhone, maskZipCode } from "@/utils/masks";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  profile: ProfileMeData | undefined;
  userEmail: string | undefined;
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("profile");
  const [isLoading, setIsLoading] = useState(false);

  // Form state - aplica máscaras aos valores iniciais
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

    // Aplica máscaras conforme o campo
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

  const inputClassName = cn(
    "bg-zinc-900/50 border-zinc-700/50 rounded-lg",
    "text-white placeholder:text-zinc-500",
    "focus:border-amber-500/50 focus:ring-amber-500/20",
  );

  const labelClassName = "text-zinc-300 text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-700/50 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <User className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {t("personalInfo.title")}
            </h3>
            <p className="text-sm text-zinc-400">
              {t("personalInfo.description")}
            </p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className={labelClassName}>
              {t("personalInfo.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={userEmail || ""}
              disabled
              className="bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
            />
            <p className="text-xs text-zinc-500">
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
        </div>
      </div>

      {/* Address */}
      <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-700/50 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <MapPin className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{t("address.title")}</h3>
            <p className="text-sm text-zinc-400">{t("address.description")}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
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
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold h-12"
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
