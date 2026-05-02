import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAppointmentActions } from "../useAppointmentActions";
import type { AppointmentWithDetails } from "@/types/booking";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
const mockToast = vi.mocked(toast);

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: null,
    guestClientId: null,
    barberId: "b-1",
    serviceId: "s-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
    service: { id: "s-1", name: "Corte", duration: 30, price: 50 },
    barber: { id: "b-1", name: "Carlos", avatarUrl: null },
    client: null,
    guestClient: null,
    ...overrides,
  } as AppointmentWithDetails;
}

describe("useAppointmentActions", () => {
  let mockCancelMutateAsync: ReturnType<
    typeof vi.fn<(params: { appointmentId: string }) => Promise<unknown>>
  >;
  let mockFeedbackMutateAsync: ReturnType<
    typeof vi.fn<
      (params: {
        appointmentId: string;
        rating: number;
        comment?: string;
      }) => Promise<unknown>
    >
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelMutateAsync = vi
      .fn<(params: { appointmentId: string }) => Promise<unknown>>()
      .mockResolvedValue(undefined);
    mockFeedbackMutateAsync = vi
      .fn<
        (params: {
          appointmentId: string;
          rating: number;
          comment?: string;
        }) => Promise<unknown>
      >()
      .mockResolvedValue(undefined);
  });

  describe("cancellation", () => {
    it("initializes with cancellingId and pendingCancelId as null", () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );
      expect(result.current.cancellingId).toBeNull();
      expect(result.current.pendingCancelId).toBeNull();
    });

    it("requestCancel sets pendingCancelId and dismissCancel clears it", () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));
      expect(result.current.pendingCancelId).toBe("apt-1");

      act(() => result.current.dismissCancel());
      expect(result.current.pendingCancelId).toBeNull();
    });

    it("sets cancellingId during confirmCancel", async () => {
      let resolveCancel: () => void;
      mockCancelMutateAsync.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveCancel = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));

      let cancelPromise: Promise<void> = Promise.resolve();
      act(() => {
        cancelPromise = result.current.confirmCancel();
      });

      expect(result.current.cancellingId).toBe("apt-1");

      await act(async () => {
        resolveCancel();
        await cancelPromise;
      });

      expect(result.current.cancellingId).toBeNull();
    });

    it("shows success toast on successful cancellation", async () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));
      await act(async () => {
        await result.current.confirmCancel();
      });

      expect(mockCancelMutateAsync).toHaveBeenCalledWith({
        appointmentId: "apt-1",
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        "Agendamento cancelado com sucesso!",
      );
    });

    it("shows blocked error toast when cancellation is blocked", async () => {
      mockCancelMutateAsync.mockRejectedValue(
        new Error("CANCELLATION_BLOCKED"),
      );

      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));
      await act(async () => {
        await result.current.confirmCancel();
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        "Cancelamento não permitido com menos de 2 horas de antecedência.",
      );
    });

    it("shows generic error toast for other errors", async () => {
      mockCancelMutateAsync.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));
      await act(async () => {
        await result.current.confirmCancel();
      });

      expect(mockToast.error).toHaveBeenCalledWith("Network error");
    });

    it("resets cancellingId after error", async () => {
      mockCancelMutateAsync.mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => result.current.requestCancel("apt-1"));
      await act(async () => {
        await result.current.confirmCancel();
      });

      expect(result.current.cancellingId).toBeNull();
    });

    it("confirmCancel does nothing when pendingCancelId is null", async () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      await act(async () => {
        await result.current.confirmCancel();
      });

      expect(mockCancelMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("feedback", () => {
    it("initializes feedback state as closed", () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      expect(result.current.feedbackModalOpen).toBe(false);
      expect(result.current.feedbackAppointment).toBeNull();
      expect(result.current.feedbacksGiven.size).toBe(0);
    });

    it("opens feedback modal with appointment data", () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      const apt = buildAppointment({ id: "apt-feedback" });
      act(() => {
        result.current.handleOpenFeedback(apt);
      });

      expect(result.current.feedbackModalOpen).toBe(true);
      expect(result.current.feedbackAppointment?.id).toBe("apt-feedback");
    });

    it("closes feedback modal via setFeedbackModalOpen", () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
        }),
      );

      act(() => {
        result.current.handleOpenFeedback(buildAppointment());
      });
      expect(result.current.feedbackModalOpen).toBe(true);

      act(() => {
        result.current.setFeedbackModalOpen(false);
      });
      expect(result.current.feedbackModalOpen).toBe(false);
    });

    it("submits feedback and tracks given feedback", async () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
          feedbackMutateAsync: mockFeedbackMutateAsync,
        }),
      );

      const apt = buildAppointment({ id: "apt-fb" });
      act(() => {
        result.current.handleOpenFeedback(apt);
      });

      await act(async () => {
        await result.current.handleSubmitFeedback({
          rating: 5,
          comment: "Top",
        });
      });

      expect(mockFeedbackMutateAsync).toHaveBeenCalledWith({
        appointmentId: "apt-fb",
        rating: 5,
        comment: "Top",
      });
      expect(result.current.feedbacksGiven.has("apt-fb")).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        "Obrigado pela avaliação!",
      );
    });

    it("does nothing when submitting feedback without selected appointment", async () => {
      const { result } = renderHook(() =>
        useAppointmentActions({
          cancelMutateAsync: mockCancelMutateAsync,
          feedbackMutateAsync: mockFeedbackMutateAsync,
        }),
      );

      await act(async () => {
        await result.current.handleSubmitFeedback({ rating: 5 });
      });

      expect(mockFeedbackMutateAsync).not.toHaveBeenCalled();
    });
  });
});
