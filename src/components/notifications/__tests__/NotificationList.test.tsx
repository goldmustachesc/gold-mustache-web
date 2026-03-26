import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationList } from "../NotificationList";
import type { NotificationData } from "@/types/booking";

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: () => "01/01/2026",
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ now: new Date("2026-03-05T15:00:00Z") });
});

const MOCK_NOTIFICATIONS: NotificationData[] = [
  {
    id: "n-1",
    userId: "u-1",
    type: "APPOINTMENT_CONFIRMED",
    title: "Agendamento confirmado",
    message: "Seu horário foi confirmado",
    data: null,
    read: false,
    createdAt: new Date(Date.now() - 30 * 1000).toISOString(),
  },
  {
    id: "n-2",
    userId: "u-1",
    type: "APPOINTMENT_CANCELLED",
    title: "Agendamento cancelado",
    message: "Seu horário foi cancelado",
    data: null,
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

describe("NotificationList", () => {
  it("renders notifications", () => {
    vi.useRealTimers();
    render(
      <NotificationList
        notifications={MOCK_NOTIFICATIONS}
        onMarkAsRead={vi.fn()}
      />,
    );
    expect(screen.getByText("Agendamento confirmado")).toBeInTheDocument();
    expect(screen.getByText("Agendamento cancelado")).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    vi.useRealTimers();
    render(
      <NotificationList
        notifications={[]}
        onMarkAsRead={vi.fn()}
        isLoading={true}
      />,
    );
    expect(screen.queryByText("Nenhuma notificação")).not.toBeInTheDocument();
  });

  it("shows empty state when no notifications", () => {
    vi.useRealTimers();
    render(<NotificationList notifications={[]} onMarkAsRead={vi.fn()} />);
    expect(screen.getByText("Nenhuma notificação")).toBeInTheDocument();
  });

  it("calls onMarkAsRead when clicking unread notification", async () => {
    vi.useRealTimers();
    const onMarkAsRead = vi.fn();
    const user = userEvent.setup();
    render(
      <NotificationList
        notifications={MOCK_NOTIFICATIONS}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    await user.click(screen.getByText("Agendamento confirmado"));

    expect(onMarkAsRead).toHaveBeenCalledWith("n-1");
  });

  it("does not call onMarkAsRead when clicking read notification", async () => {
    vi.useRealTimers();
    const onMarkAsRead = vi.fn();
    const user = userEvent.setup();
    render(
      <NotificationList
        notifications={MOCK_NOTIFICATIONS}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    await user.click(screen.getByText("Agendamento cancelado"));

    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it("formats time as 'Agora' for less than 1 minute", () => {
    render(
      <NotificationList
        notifications={[
          {
            ...MOCK_NOTIFICATIONS[0],
            createdAt: new Date(Date.now() - 10 * 1000).toISOString(),
          },
        ]}
        onMarkAsRead={vi.fn()}
      />,
    );
    expect(screen.getByText("Agora")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("formats time in minutes for less than 1 hour", () => {
    render(
      <NotificationList
        notifications={[
          {
            ...MOCK_NOTIFICATIONS[0],
            createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          },
        ]}
        onMarkAsRead={vi.fn()}
      />,
    );
    expect(screen.getByText("15min")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
