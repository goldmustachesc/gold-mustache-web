import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatBookingPage } from "../ChatBookingPage";

const WAIT_FOR_CHAT_TIMEOUT = 5000;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  onViewAppointments: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  userState: {
    data: null as { id: string } | null,
  },
  profileState: {
    data: null as { fullName?: string | null; phone?: string | null } | null,
    isLoading: false,
  },
  barbersState: {
    data: [{ id: "barber-1", name: "Carlos", avatarUrl: null }],
    isLoading: false,
  },
  servicesState: {
    data: [
      {
        id: "service-1",
        name: "Corte",
        price: 50,
        duration: 30,
        description: null,
      },
    ],
    isLoading: false,
  },
  slotsState: {
    data: {
      barberId: "barber-1",
      serviceDuration: 30,
      windows: [{ startTime: "09:00", endTime: "11:00" }],
    },
    isLoading: false,
  },
  createAppointment: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  createGuestAppointment: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mocks.userState,
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => mocks.profileState,
}));

vi.mock("@/hooks/useBooking", () => ({
  useBarbers: () => mocks.barbersState,
  useServices: () => mocks.servicesState,
  useSlots: () => mocks.slotsState,
  useCreateAppointment: () => mocks.createAppointment,
  useCreateGuestAppointment: () => mocks.createGuestAppointment,
}));

vi.mock("@/utils/time-slots", () => ({
  formatDateToString: () => "2026-03-10",
}));

vi.mock("@/utils/datetime", () => ({
  formatDateDdMmYyyyInSaoPaulo: () => "10/03/2026",
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("../chat", () => ({
  BotMessage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  UserMessage: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TypingIndicator: () => <div>digitando</div>,
  ChatContainer: ({
    children,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div data-testid="chat-container">{children}</div>,
}));

vi.mock("../chat/ChatBarberSelector", () => ({
  ChatBarberSelector: ({
    barbers,
    onSelect,
  }: {
    barbers: Array<{ id: string; name: string; avatarUrl: string | null }>;
    onSelect: (barber: {
      id: string;
      name: string;
      avatarUrl: string | null;
    }) => void;
    isLoading: boolean;
  }) => (
    <div>
      {barbers.map((barber) => (
        <button type="button" key={barber.id} onClick={() => onSelect(barber)}>
          {barber.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../chat/ChatServiceSelector", () => ({
  ChatServiceSelector: ({
    services,
    onSelect,
  }: {
    services: Array<{
      id: string;
      name: string;
      price: number;
      duration: number;
      description: string | null;
    }>;
    onSelect: (service: {
      id: string;
      name: string;
      price: number;
      duration: number;
      description: string | null;
    }) => void;
    isLoading: boolean;
  }) => (
    <div>
      {services.map((service) => (
        <button
          type="button"
          key={service.id}
          onClick={() => onSelect(service)}
        >
          {service.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../chat/ChatDatePicker", () => ({
  ChatDatePicker: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button
      type="button"
      onClick={() => onSelect(new Date("2026-03-10T12:00:00.000Z"))}
    >
      selecionar-data
    </button>
  ),
}));

vi.mock("../chat/ChatTimeSlotSelector", () => ({
  ChatTimeSlotSelector: ({
    availability,
    onSelect,
    onChooseAnotherDate,
  }: {
    availability: {
      barberId: string;
      windows: Array<{ startTime: string; endTime: string }>;
    } | null;
    onSelect: (slot: { time: string; available: boolean }) => void;
    onChooseAnotherDate: () => void;
    isLoading: boolean;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSelect({
            time: availability?.windows[0]?.startTime ?? "09:00",
            available: true,
          })
        }
      >
        selecionar-horario
      </button>
      <button type="button" onClick={onChooseAnotherDate}>
        escolher-outra-data
      </button>
    </div>
  ),
}));

vi.mock("../chat/ChatGuestInfoForm", () => ({
  ChatGuestInfoForm: ({
    onSubmit,
  }: {
    onSubmit: (data: { clientName: string; clientPhone: string }) => void;
    isLoading: boolean;
    submitLabel: string;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({ clientName: "João Guest", clientPhone: "11999999999" })
      }
    >
      enviar-dados-guest
    </button>
  ),
}));

vi.mock("../chat/ChatProfileUpdateForm", () => ({
  ChatProfileUpdateForm: ({
    onSuccess,
  }: {
    currentName?: string | null;
    currentPhone?: string | null;
    onSuccess: () => void;
    isLoading: boolean;
  }) => (
    <button type="button" onClick={onSuccess}>
      atualizar-perfil
    </button>
  ),
}));

vi.mock("../BookingConfirmation", () => ({
  BookingConfirmation: ({
    appointment,
    onClose,
    onViewAppointments,
  }: {
    appointment: { id: string };
    onClose: () => void;
    onViewAppointments?: () => void;
  }) => (
    <div>
      <span>{`confirmado:${appointment.id}`}</span>
      <button type="button" onClick={onClose}>
        fechar-confirmacao
      </button>
      <button type="button" onClick={onViewAppointments}>
        ver-agendamentos
      </button>
    </div>
  ),
}));

vi.mock("../SignupIncentiveBanner", () => ({
  SignupIncentiveBanner: ({ locale }: { locale: string }) => (
    <div>{`signup-banner:${locale}`}</div>
  ),
}));

describe("ChatBookingPage flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userState.data = null;
    mocks.profileState.data = null;
    mocks.profileState.isLoading = false;
    mocks.createAppointment.isPending = false;
    mocks.createGuestAppointment.isPending = false;
    mocks.createAppointment.mutateAsync.mockResolvedValue({
      id: "apt-user-1",
    });
    mocks.createGuestAppointment.mutateAsync.mockResolvedValue({
      appointment: { id: "apt-guest-1" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("conclui fluxo de guest e redireciona para meus agendamentos", async () => {
    const user = userEvent.setup();

    render(<ChatBookingPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Carlos"));

    await waitFor(
      () => {
        expect(screen.getByText("Corte")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Corte"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-data")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-data"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-horario")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-horario"));

    await waitFor(
      () => {
        expect(screen.getByText("enviar-dados-guest")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("enviar-dados-guest"));

    await waitFor(
      () => {
        expect(
          screen.getByText("✅ Confirmar Agendamento"),
        ).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("✅ Confirmar Agendamento"));

    await waitFor(
      () => {
        expect(mocks.createGuestAppointment.mutateAsync).toHaveBeenCalledWith({
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2026-03-10",
          startTime: "09:00",
          clientName: "João Guest",
          clientPhone: "11999999999",
        });
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Agendamento realizado com sucesso!",
    );
    expect(screen.getByText("confirmado:apt-guest-1")).toBeInTheDocument();
    expect(screen.getByText("signup-banner:pt-BR")).toBeInTheDocument();

    await user.click(screen.getByText("ver-agendamentos"));

    expect(mocks.push).toHaveBeenCalledWith("/pt-BR/meus-agendamentos");
  }, 15000);

  it("leva usuario autenticado com perfil incompleto para atualizar perfil antes de confirmar", async () => {
    const user = userEvent.setup();
    mocks.userState.data = { id: "user-1" };
    mocks.profileState.data = { fullName: "Leo", phone: "" };

    render(<ChatBookingPage onViewAppointments={mocks.onViewAppointments} />);

    await waitFor(
      () => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Carlos"));

    await waitFor(
      () => {
        expect(screen.getByText("Corte")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Corte"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-data")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-data"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-horario")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-horario"));

    await waitFor(
      () => {
        expect(screen.getByText("atualizar-perfil")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("atualizar-perfil"));

    await waitFor(
      () => {
        expect(
          screen.getByText("✅ Confirmar Agendamento"),
        ).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("✅ Confirmar Agendamento"));

    await waitFor(
      () => {
        expect(mocks.createAppointment.mutateAsync).toHaveBeenCalledWith({
          serviceId: "service-1",
          barberId: "barber-1",
          date: "2026-03-10",
          startTime: "09:00",
        });
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );
    expect(screen.getByText("confirmado:apt-user-1")).toBeInTheDocument();
    expect(screen.queryByText("signup-banner:pt-BR")).not.toBeInTheDocument();

    await user.click(screen.getByText("ver-agendamentos"));

    expect(mocks.onViewAppointments).toHaveBeenCalled();
  }, 15000);

  it("retorna para escolha de horario quando o slot ja foi ocupado", async () => {
    const user = userEvent.setup();
    mocks.createGuestAppointment.mutateAsync.mockRejectedValue(
      new Error("Horário ocupado"),
    );

    render(<ChatBookingPage />);

    await waitFor(
      () => {
        expect(screen.getByText("Carlos")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Carlos"));

    await waitFor(
      () => {
        expect(screen.getByText("Corte")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("Corte"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-data")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-data"));

    await waitFor(
      () => {
        expect(screen.getByText("selecionar-horario")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("selecionar-horario"));

    await waitFor(
      () => {
        expect(screen.getByText("enviar-dados-guest")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("enviar-dados-guest"));

    await waitFor(
      () => {
        expect(
          screen.getByText("✅ Confirmar Agendamento"),
        ).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );

    await user.click(screen.getByText("✅ Confirmar Agendamento"));

    await waitFor(
      () => {
        expect(mocks.toastError).toHaveBeenCalledWith("Horário ocupado");
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );
    expect(
      screen.getByText(
        "😔 Este horário já foi ocupado. Por favor, escolha outro horário.",
      ),
    ).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByText("selecionar-horario")).toBeInTheDocument();
      },
      { timeout: WAIT_FOR_CHAT_TIMEOUT },
    );
  }, 15000);
});
