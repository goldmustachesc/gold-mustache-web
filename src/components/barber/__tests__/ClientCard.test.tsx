import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientCard } from "../ClientCard";

beforeEach(() => {
  vi.clearAllMocks();
});

const REGISTERED_CLIENT = {
  id: "cl-1",
  fullName: "João Silva",
  phone: "47996358807",
  type: "registered" as const,
  appointmentCount: 5,
  lastAppointment: "2026-03-01",
};

const GUEST_CLIENT = {
  id: "cl-2",
  fullName: "Maria Santos",
  phone: "4733221100",
  type: "guest" as const,
  appointmentCount: 1,
  lastAppointment: "2026-02-15",
};

describe("ClientCard", () => {
  it("formats 11-digit phone correctly", () => {
    render(<ClientCard client={REGISTERED_CLIENT} />);
    expect(screen.getByText("+55 47 99635-8807")).toBeInTheDocument();
  });

  it("formats 10-digit phone correctly", () => {
    render(<ClientCard client={GUEST_CLIENT} />);
    expect(screen.getByText("+55 47 3322-1100")).toBeInTheDocument();
  });

  it("shows guest badge for guest clients", () => {
    render(<ClientCard client={GUEST_CLIENT} />);
    expect(screen.getByText("Convidado")).toBeInTheDocument();
  });

  it("does not show guest badge for registered clients", () => {
    render(<ClientCard client={REGISTERED_CLIENT} />);
    expect(screen.queryByText("Convidado")).not.toBeInTheDocument();
  });

  it("opens WhatsApp with correct URL", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    render(<ClientCard client={REGISTERED_CLIENT} />);

    await user.click(screen.getByTitle("Enviar WhatsApp"));

    expect(openSpy).toHaveBeenCalledWith(
      "https://wa.me/5547996358807",
      "_blank",
    );
  });

  it("calls onEdit callback with client data", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<ClientCard client={REGISTERED_CLIENT} onEdit={onEdit} />);

    await user.click(screen.getByTitle("Editar cliente"));

    expect(onEdit).toHaveBeenCalledWith(REGISTERED_CLIENT);
  });

  it("calls onViewHistory callback with client data", async () => {
    const onViewHistory = vi.fn();
    const user = userEvent.setup();
    render(
      <ClientCard client={REGISTERED_CLIENT} onViewHistory={onViewHistory} />,
    );

    await user.click(screen.getByTitle("Ver histórico"));

    expect(onViewHistory).toHaveBeenCalledWith(REGISTERED_CLIENT);
  });
});
