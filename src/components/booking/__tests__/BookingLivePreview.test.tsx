import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BookingLivePreview } from "../BookingLivePreview";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/booking/time", () => ({
  calculateEndTime: (time: string, duration: number) => {
    const [h, m] = time.split(":").map(Number);
    const end = h * 60 + (m ?? 0) + duration;
    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  },
}));

const mockBarber = { id: "barber-1", name: "Carlos", avatarUrl: null };
const mockService = {
  id: "service-1",
  slug: "corte",
  name: "Corte",
  price: 50,
  duration: 30,
  description: null,
  active: true,
};
const mockDate = new Date("2026-05-01T15:00:00.000Z");
const mockSlot = { time: "09:00", available: true };
const mockGuestInfo = { clientName: "João Silva", clientPhone: "11999999999" };

const defaultProps = {
  barber: null,
  service: null,
  date: null,
  slot: null,
  guestInfo: null,
  isGuest: false,
  step: "barber" as const,
  isConfirming: false,
  onConfirm: vi.fn(),
  onBackFromReview: vi.fn(),
  onEditCustomerData: vi.fn(),
};

describe("BookingLivePreview", () => {
  it("renderiza estado vazio sem nenhuma seleção", () => {
    render(<BookingLivePreview {...defaultProps} />);
    expect(screen.getByText("Selecione um barbeiro")).toBeInTheDocument();
    expect(screen.getByText("Aguardando escolha")).toBeInTheDocument();
    expect(screen.getByText("A definir")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Confirmar agendamento" }),
    ).not.toBeInTheDocument();
  });

  it("mostra barbeiro quando fornecido", () => {
    render(<BookingLivePreview {...defaultProps} barber={mockBarber} />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("CA")).toBeInTheDocument();
  });

  it("mostra serviço com duração e preço", () => {
    render(<BookingLivePreview {...defaultProps} service={mockService} />);
    expect(screen.getByText("Corte")).toBeInTheDocument();
    expect(screen.getByText("30 min · R$ 50,00")).toBeInTheDocument();
  });

  it("mostra data e faixa de horário", () => {
    render(
      <BookingLivePreview
        {...defaultProps}
        date={mockDate}
        slot={mockSlot}
        service={mockService}
      />,
    );
    expect(screen.getByText(/maio/i)).toBeInTheDocument();
    expect(screen.getByText("09:00 – 09:30")).toBeInTheDocument();
  });

  it("em review renderiza CTAs e título de confirmação", () => {
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        step="review"
      />,
    );
    expect(screen.getByText("Confirme seu agendamento")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voltar e editar" }),
    ).toBeInTheDocument();
  });

  it("em review + guest mostra dados do cliente e botão editar", () => {
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        guestInfo={mockGuestInfo}
        isGuest
        step="review"
      />,
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /editar dados/i }),
    ).toBeInTheDocument();
  });

  it("em review + usuário logado mostra mensagem de cadastro pronto", () => {
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        isGuest={false}
        step="review"
      />,
    );
    expect(
      screen.getByText("Cadastro pronto para confirmar."),
    ).toBeInTheDocument();
  });

  it("isConfirming=true desabilita CTAs e mostra spinner", () => {
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        step="review"
        isConfirming
      />,
    );
    expect(screen.getByRole("button", { name: /confirmando/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Voltar e editar" }),
    ).toBeDisabled();
  });

  it("dispara onConfirm ao clicar em confirmar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        step="review"
        onConfirm={onConfirm}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("dispara onBackFromReview ao clicar em voltar", async () => {
    const user = userEvent.setup();
    const onBackFromReview = vi.fn();
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        step="review"
        onBackFromReview={onBackFromReview}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Voltar e editar" }));
    expect(onBackFromReview).toHaveBeenCalledOnce();
  });

  it("dispara onEditCustomerData ao clicar em editar dados", async () => {
    const user = userEvent.setup();
    const onEditCustomerData = vi.fn();
    render(
      <BookingLivePreview
        {...defaultProps}
        barber={mockBarber}
        service={mockService}
        date={mockDate}
        slot={mockSlot}
        step="review"
        onEditCustomerData={onEditCustomerData}
      />,
    );
    await user.click(screen.getByRole("button", { name: /editar dados/i }));
    expect(onEditCustomerData).toHaveBeenCalledOnce();
  });
});
