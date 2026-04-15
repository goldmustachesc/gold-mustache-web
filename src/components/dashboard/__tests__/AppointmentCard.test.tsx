import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentCard } from "../AppointmentCard";
import type { AppointmentWithDetails } from "@/types/booking";

const mockGetMinutesUntilAppointment = vi.hoisted(() =>
  vi.fn((_dateStr: string, _time: string, _ref?: Date) => 30),
);

vi.mock("@/utils/time-slots", () => ({
  getMinutesUntilAppointment: (...args: [string, string, Date?]) =>
    mockGetMinutesUntilAppointment(...args),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsDesktop: () => false,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    asChild,
    children,
    ...props
  }: {
    asChild?: boolean;
    children: ReactNode;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  }) =>
    asChild ? (
      children
    ) : (
      <button type="button" {...props}>
        {children}
      </button>
    ),
}));

vi.mock("../BarberChairIcon", () => ({
  BarberChairIcon: () => null,
}));

function buildAppointment(
  overrides: Partial<AppointmentWithDetails> = {},
): AppointmentWithDetails {
  return {
    id: "apt-1",
    clientId: "client-1",
    guestClientId: null,
    barberId: "barber-1",
    serviceId: "service-1",
    date: "2026-03-10",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    cancelReason: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    client: {
      id: "client-1",
      fullName: "João Silva",
      phone: "11999999999",
    },
    guestClient: null,
    barber: {
      id: "barber-1",
      name: "Carlos",
      avatarUrl: null,
    },
    service: {
      id: "service-1",
      name: "Corte",
      duration: 30,
      price: 50,
    },
    ...overrides,
  };
}

function renderAppointmentCard(
  appointment: AppointmentWithDetails = buildAppointment(),
  options?: {
    hideValues?: boolean;
    sendingReminderId?: string | null;
  },
) {
  const onOpenDetail = vi.fn();
  const onSendReminder = vi.fn();
  const onCancelAppointment = vi.fn().mockResolvedValue(true);
  const onMarkNoShow = vi.fn();
  const onMarkComplete = vi.fn();

  render(
    <AppointmentCard
      appointment={appointment}
      onOpenDetail={onOpenDetail}
      onSendReminder={onSendReminder}
      sendingReminderId={options?.sendingReminderId ?? null}
      onCancelAppointment={onCancelAppointment}
      onMarkNoShow={onMarkNoShow}
      onMarkComplete={onMarkComplete}
      hideValues={options?.hideValues ?? false}
      maskedValue="R$ ***,**"
    />,
  );

  return {
    onOpenDetail,
    onSendReminder,
    onCancelAppointment,
    onMarkNoShow,
    onMarkComplete,
  };
}

describe("dashboard AppointmentCard", () => {
  beforeEach(() => {
    mockGetMinutesUntilAppointment.mockReturnValue(30);
  });

  it("opens the detail sheet when the card is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenDetail } = renderAppointmentCard();

    await user.click(screen.getByText("João Silva"));

    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "apt-1" }),
    );
  });

  it("opens the detail sheet with keyboard activation", () => {
    const { onOpenDetail } = renderAppointmentCard();
    const card = screen.getByText("João Silva").closest('[role="button"]');

    expect(card).not.toBeNull();

    fireEvent.keyDown(card as HTMLElement, { key: "Enter" });

    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "apt-1" }),
    );
  });

  it("opens the detail sheet with space key", () => {
    const { onOpenDetail } = renderAppointmentCard();
    const card = screen.getByText("João Silva").closest('[role="button"]');

    expect(card).not.toBeNull();

    fireEvent.keyDown(card as HTMLElement, { key: " " });

    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "apt-1" }),
    );
  });

  it("sends a reminder from the reminder action", async () => {
    const user = userEvent.setup();
    const { onSendReminder } = renderAppointmentCard();

    await user.click(screen.getByTitle("Enviar lembrete ao cliente"));

    expect(onSendReminder).toHaveBeenCalledWith("apt-1");
  });

  it("abre o sheet de cancelamento e envia o motivo ao confirmar", async () => {
    const user = userEvent.setup();
    const { onCancelAppointment } = renderAppointmentCard();

    await user.click(screen.getByText("Cancelar"));

    expect(screen.getByText("Cancelar atendimento")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "Cliente pediu cancelamento" } },
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    expect(onCancelAppointment).toHaveBeenCalledWith(
      "apt-1",
      "Cliente pediu cancelamento",
    );
  });

  it("envia ao pai o motivo já sem espaços nas pontas", async () => {
    const user = userEvent.setup();
    const { onCancelAppointment } = renderAppointmentCard();

    await user.click(screen.getByText("Cancelar"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "  texto útil  " } },
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    );

    expect(onCancelAppointment).toHaveBeenCalledWith("apt-1", "texto útil");
  });

  it("não envia cancelamento sem motivo nem só com espaços (botão desabilitado)", async () => {
    const user = userEvent.setup();
    const { onCancelAppointment } = renderAppointmentCard();

    await user.click(screen.getByText("Cancelar"));

    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeDisabled();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo do cancelamento" }),
      { target: { value: "   \n  " } },
    );
    expect(
      screen.getByRole("button", { name: /confirmar cancelamento/i }),
    ).toBeDisabled();
    expect(onCancelAppointment).not.toHaveBeenCalled();
  });

  it("marks a past confirmed appointment as no-show", async () => {
    const user = userEvent.setup();
    mockGetMinutesUntilAppointment.mockReturnValue(-10);
    const { onMarkNoShow } = renderAppointmentCard();

    expect(screen.getByText("Marcar não compareceu").className).toContain(
      "border-warning/30",
    );
    await user.click(screen.getByText("Marcar não compareceu"));

    expect(onMarkNoShow).toHaveBeenCalledWith("apt-1");
  });

  it("marks a past confirmed appointment as complete", async () => {
    const user = userEvent.setup();
    mockGetMinutesUntilAppointment.mockReturnValue(-10);
    const { onMarkComplete } = renderAppointmentCard();

    expect(screen.getByText("Concluir").className).toContain(
      "border-success/30",
    );
    await user.click(screen.getByText("Concluir"));

    expect(onMarkComplete).toHaveBeenCalledWith("apt-1");
  });

  it("renders a tel link for no-show guest appointments with phone", () => {
    renderAppointmentCard(
      buildAppointment({
        clientId: null,
        guestClientId: "guest-1",
        status: "NO_SHOW",
        client: null,
        guestClient: {
          id: "guest-1",
          fullName: "Pedro Guest",
          phone: "11888888888",
        },
      }),
    );

    expect(screen.getByText("Não compareceu").className).toContain(
      "bg-warning",
    );
    expect(screen.getByText("Não compareceu").className).toContain(
      "text-warning-foreground",
    );
    expect(
      screen.getByRole("link", { name: "Ligar para cliente" }),
    ).toHaveAttribute("href", "tel:11888888888");
  });

  it("masks the service price when hideValues is enabled", () => {
    renderAppointmentCard(buildAppointment(), { hideValues: true });

    expect(screen.getByText("R$ ***,**")).toBeInTheDocument();
    expect(screen.queryByText("R$ 50,00")).not.toBeInTheDocument();
  });

  it("renders cancelled appointments with badge and without reminder action", () => {
    renderAppointmentCard(
      buildAppointment({
        status: "CANCELLED_BY_BARBER",
      }),
    );

    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(
      screen.queryByTitle("Enviar lembrete ao cliente"),
    ).not.toBeInTheDocument();
  });

  it("renders completed appointments with success badge and without reminder action", () => {
    renderAppointmentCard(
      buildAppointment({
        status: "COMPLETED",
      }),
    );

    expect(screen.getByText("Concluído")).toBeInTheDocument();
    expect(screen.getByText("Concluído").className).toContain("bg-success/15");
    expect(screen.getByText("Concluído").className).toContain(
      "text-foreground",
    );
    expect(
      screen.queryByTitle("Enviar lembrete ao cliente"),
    ).not.toBeInTheDocument();
  });
});
