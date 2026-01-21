"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, UserCircle, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ChatProfileUpdateFormProps {
  currentName?: string | null;
  currentPhone?: string | null;
  onSuccess: () => void;
  isLoading?: boolean;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  // 10 digits = landline (XX) XXXX-XXXX, 11 digits = mobile (XX) XXXXX-XXXX
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function ChatProfileUpdateForm({
  currentName,
  currentPhone,
  onSuccess,
  isLoading: externalLoading,
}: ChatProfileUpdateFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName || "");
  const [phone, setPhone] = useState(
    currentPhone ? formatPhone(currentPhone) : "",
  );
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsName = !currentName || currentName.trim().length < 2;
  const needsPhone = !currentPhone || getPhoneDigits(currentPhone).length < 10;
  const hasAutoProceededRef = useRef(false);

  // If profile is already complete (e.g., was loading when redirected here), auto-proceed
  useEffect(() => {
    const profileAlreadyComplete =
      !needsName && !needsPhone && !externalLoading;
    if (profileAlreadyComplete && !hasAutoProceededRef.current) {
      hasAutoProceededRef.current = true;
      onSuccess();
    }
  }, [needsName, needsPhone, externalLoading, onSuccess]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      setPhone(formatted);
      setErrors((prev) => ({ ...prev, phone: undefined }));
    },
    [],
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      setErrors((prev) => ({ ...prev, name: undefined }));
    },
    [],
  );

  const validate = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};

    if (needsName && (!name.trim() || name.trim().length < 2)) {
      newErrors.name = "Nome muito curto";
    }

    const phoneDigits = getPhoneDigits(phone);
    if (needsPhone && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      newErrors.phone = "Telefone inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const updateData: { fullName?: string; phone?: string } = {};

      if (needsName) {
        updateData.fullName = name.trim();
      }
      if (needsPhone) {
        // Send only digits to maintain consistency in database
        updateData.phone = getPhoneDigits(phone);
      }

      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar perfil");
      }

      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      toast.success("Perfil atualizado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex items-start gap-3 pb-3 border-b border-amber-500/20">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-200">
              Complete seu cadastro
            </p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Precisamos do seu{" "}
              {needsName && needsPhone
                ? "nome e telefone"
                : needsPhone
                  ? "telefone"
                  : "nome"}{" "}
              para confirmar o agendamento.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {needsName && (
            <div>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={handleNameChange}
                  disabled={isLoading}
                  className={cn(
                    "pl-10 bg-zinc-50/50 border-zinc-300 text-zinc-900 placeholder:text-zinc-500 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-100",
                    "focus:border-amber-500 focus:ring-amber-500/20",
                    errors.name && "border-destructive",
                  )}
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>
          )}

          {needsPhone && (
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  className={cn(
                    "pl-10 bg-zinc-50/50 border-zinc-300 text-zinc-900 placeholder:text-zinc-500 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-100",
                    "focus:border-amber-500 focus:ring-amber-500/20",
                    errors.phone && "border-destructive",
                  )}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full shadow-md"
        disabled={
          isLoading || (needsName && !name.trim()) || (needsPhone && !phone)
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          "Salvar e Continuar"
        )}
      </Button>
    </form>
  );
}
