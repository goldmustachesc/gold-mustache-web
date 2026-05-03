import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { AppointmentWithDetails } from "@/types/booking";

const CANCELLATION_BLOCKED_CODE = "CANCELLATION_BLOCKED";

interface UseAppointmentActionsOptions {
  cancelMutateAsync: (params: { appointmentId: string }) => Promise<unknown>;
  feedbackMutateAsync?: (params: {
    appointmentId: string;
    rating: number;
    comment?: string;
  }) => Promise<unknown>;
}

export function useAppointmentActions({
  cancelMutateAsync,
  feedbackMutateAsync,
}: UseAppointmentActionsOptions) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [feedbacksGiven, setFeedbacksGiven] = useState<Set<string>>(new Set());

  const requestCancel = useCallback((appointmentId: string) => {
    setPendingCancelId(appointmentId);
  }, []);

  const dismissCancel = useCallback(() => {
    setPendingCancelId(null);
  }, []);

  const handleCancel = useCallback(
    async (appointmentId: string) => {
      setCancellingId(appointmentId);
      try {
        await cancelMutateAsync({ appointmentId });
        toast.success("Agendamento cancelado com sucesso!");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro ao cancelar";
        if (errorMessage === CANCELLATION_BLOCKED_CODE) {
          toast.error(
            "Cancelamento não permitido com menos de 2 horas de antecedência.",
          );
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setCancellingId(null);
      }
    },
    [cancelMutateAsync],
  );

  const confirmCancel = useCallback(async () => {
    if (!pendingCancelId) return;
    const id = pendingCancelId;
    setPendingCancelId(null);
    await handleCancel(id);
  }, [pendingCancelId, handleCancel]);

  const handleOpenFeedback = useCallback(
    (appointment: AppointmentWithDetails) => {
      setFeedbackAppointment(appointment);
      setFeedbackModalOpen(true);
    },
    [],
  );

  const handleSubmitFeedback = useCallback(
    async (data: { rating: number; comment?: string }) => {
      if (!feedbackAppointment || !feedbackMutateAsync) return;

      await feedbackMutateAsync({
        appointmentId: feedbackAppointment.id,
        rating: data.rating,
        comment: data.comment,
      });

      setFeedbacksGiven((prev) => new Set(prev).add(feedbackAppointment.id));
      toast.success("Obrigado pela avaliação!");
    },
    [feedbackAppointment, feedbackMutateAsync],
  );

  return {
    cancellingId,
    pendingCancelId,
    requestCancel,
    confirmCancel,
    dismissCancel,
    feedbackModalOpen,
    setFeedbackModalOpen,
    feedbackAppointment,
    feedbacksGiven,
    handleOpenFeedback,
    handleSubmitFeedback,
  };
}
