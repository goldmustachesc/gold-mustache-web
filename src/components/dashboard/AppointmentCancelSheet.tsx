"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsDesktop } from "@/hooks/useMediaQuery";

/** Retorna `true` se o cancelamento foi concluído com sucesso (fecha o sheet). */
export type AppointmentCancelConfirmResult = boolean | Promise<boolean>;

export interface AppointmentCancelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => AppointmentCancelConfirmResult;
  isPending?: boolean;
  /** Texto opcional para contexto (ex.: nome do cliente). */
  contextLabel?: string;
}

function CancelReasonForm({
  reasonId,
  reason,
  onReasonChange,
  busy,
  onConfirm,
  onDismiss,
}: {
  reasonId: string;
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
  onDismiss: () => void;
}) {
  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <div className="p-4 pt-0 space-y-4">
      <div>
        <Label htmlFor={reasonId}>Motivo do cancelamento</Label>
        <Textarea
          id={reasonId}
          className="mt-2 min-h-[100px]"
          placeholder="Descreva o motivo..."
          value={reason}
          disabled={busy}
          onChange={(e) => onReasonChange(e.target.value)}
          aria-label="Motivo do cancelamento"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onDismiss}
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit}
          onClick={() => void onConfirm()}
          aria-label="Confirmar cancelamento"
        >
          {busy ? (
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden
              data-testid="cancel-confirm-loading"
            />
          ) : (
            "Confirmar cancelamento"
          )}
        </Button>
      </div>
    </div>
  );
}

export function AppointmentCancelSheet({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  contextLabel,
}: AppointmentCancelSheetProps) {
  const isDesktop = useIsDesktop();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const busy = isPending || internalSubmitting;

  useEffect(() => {
    if (open) {
      setReason("");
      setInternalSubmitting(false);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setInternalSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed || busy) return;
    setInternalSubmitting(true);
    try {
      const result = await Promise.resolve(onConfirm(trimmed));
      if (result) {
        handleOpenChange(false);
      }
    } catch {
      /* mantém o sheet aberto e o texto */
    } finally {
      setInternalSubmitting(false);
    }
  };

  const title = "Cancelar atendimento";
  const description = contextLabel
    ? `Este cancelamento será registrado para ${contextLabel}.`
    : "Informe o motivo para registrar o cancelamento.";

  const form = (
    <CancelReasonForm
      reasonId={reasonId}
      reason={reason}
      onReasonChange={setReason}
      busy={busy}
      onConfirm={handleConfirm}
      onDismiss={() => handleOpenChange(false)}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  );
}
