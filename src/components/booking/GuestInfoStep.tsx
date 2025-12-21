"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone } from "lucide-react";

interface GuestInfoStepProps {
  onSubmit: (data: { clientName: string; clientPhone: string }) => void;
  isLoading?: boolean;
}

// Format phone number as (XX) XXXXX-XXXX
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

// Get only digits from formatted phone
function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function GuestInfoStep({ onSubmit, isLoading }: GuestInfoStepProps) {
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
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    const phoneDigits = getPhoneDigits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      newErrors.phone = "Telefone deve ter 10 ou 11 dígitos";
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Nome
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome completo"
            value={name}
            onChange={handleNameChange}
            disabled={isLoading}
            className={errors.name ? "border-destructive" : ""}
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Telefone (WhatsApp)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            disabled={isLoading}
            className={errors.phone ? "border-destructive" : ""}
            autoComplete="tel"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
        {isLoading ? "Confirmando..." : "Confirmar Agendamento"}
      </Button>
    </form>
  );
}
