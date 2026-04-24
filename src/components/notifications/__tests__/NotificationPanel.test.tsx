import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationPanel } from "../NotificationPanel";

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockOnNewNotification = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: ({
    onNewNotification,
  }: {
    onNewNotification?: (n: unknown) => void;
  }) => {
    if (onNewNotification) {
      mockOnNewNotification.mockImplementation(onNewNotification);
    }
    return {
      notifications: [
        {
          id: "n-1",
          type: "APPOINTMENT_CONFIRMED",
          title: "Test",
          message: "msg",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      isLoading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
    };
  },
}));

const toastMocks = vi.hoisted(() => ({
  default: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(toastMocks.default, { error: toastMocks.error }),
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: () => "05/03/2026",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkAsRead.mockResolvedValue(undefined);
  mockMarkAllAsRead.mockResolvedValue(undefined);
});

describe("NotificationPanel", () => {
  it("renders notification bell with unread count", () => {
    render(<NotificationPanel userId="u-1" />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows toast for new notification when panel is closed", () => {
    render(<NotificationPanel userId="u-1" />);
    mockOnNewNotification({
      title: "Nova notificação",
      message: "Detalhes da notificação",
    });
    expect(toastMocks.default).toHaveBeenCalledWith("Nova notificação", {
      description: "Detalhes da notificação",
    });
  });

  it("shows error toast when markAsRead fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockMarkAsRead.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<NotificationPanel userId="u-1" />);

    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("Notificações")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Test"));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "Erro ao marcar notificação como lida",
      );
    });
  });
});
