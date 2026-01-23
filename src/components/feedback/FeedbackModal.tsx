"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackForm } from "./FeedbackForm";
import { CheckCircle } from "lucide-react";
import { useState } from "react";

interface FeedbackModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when form is submitted */
  onSubmit: (data: { rating: number; comment?: string }) => Promise<void>;
  /** Whether form is in loading state */
  isLoading?: boolean;
  /** Barber name */
  barberName?: string;
  /** Service name */
  serviceName?: string;
  /** Date of the appointment */
  appointmentDate?: string;
}

export function FeedbackModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  barberName,
  serviceName,
  appointmentDate,
}: FeedbackModalProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: { rating: number; comment?: string }) => {
    await onSubmit(data);
    setSubmitted(true);

    // Auto close after success
    setTimeout(() => {
      onOpenChange(false);
      setSubmitted(false);
    }, 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSubmitted(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">Obrigado pela avaliação!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sua opinião é muito importante para nós.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Avaliar Atendimento</DialogTitle>
              <DialogDescription>
                Como foi sua experiência? Sua avaliação nos ajuda a melhorar
                nossos serviços.
              </DialogDescription>
            </DialogHeader>

            {appointmentDate && (
              <p className="text-xs text-muted-foreground text-center -mt-2">
                Atendimento em {appointmentDate}
              </p>
            )}

            <FeedbackForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              barberName={barberName}
              serviceName={serviceName}
              className="mt-4"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
