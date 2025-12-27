"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatGuestInfoFormProps {
  onSubmit: (data: { clientName: string; clientPhone: string }) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function ChatGuestInfoForm({
  onSubmit,
  isLoading,
  submitLabel = "Confirmar Agendamento",
}: ChatGuestInfoFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

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

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Nome muito curto";
    }

    const phoneDigits = getPhoneDigits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      newErrors.phone = "Telefone inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      clientName: name.trim(),
      clientPhone: getPhoneDigits(phone),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="bg-background border-2 border-muted rounded-xl p-4 space-y-3">
        <div>
          <Input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={handleNameChange}
            disabled={isLoading}
            className={errors.name ? "border-destructive" : ""}
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <Input
            type="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            disabled={isLoading}
            className={errors.phone ? "border-destructive" : ""}
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !name.trim() || !phone}
      >
        {isLoading ? (
          "Confirmando..."
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            {submitLabel}
          </>
        )}
      </Button>
    </form>
  );
}
