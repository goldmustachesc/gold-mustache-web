import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "../page";

const mockUseUser = vi.hoisted(() => vi.fn());
const mockUseProfileMe = vi.hoisted(() => vi.fn());
const mockUseBarberProfile = vi.hoisted(() => vi.fn());
const mockUseDashboardStats = vi.hoisted(() => vi.fn());
const mockUseBookingSettings = vi.hoisted(() => vi.fn());
const mockUsePrivateHeader = vi.hoisted(() => vi.fn());

const translations = {
  title: "Meu Perfil",
  subtitle: "Cuide da sua conta, dos seus dados e dos próximos passos.",
  loading: "Carregando pelo locale...",
  hero: {
    eyebrow: "Ficha do cliente",
    greeting: "Seu espaço pessoal na Gold Mustache",
    description:
      "Acompanhe sua conta, mantenha seus dados em dia e resolva tudo sem sair do perfil.",
    verified: "Email verificado",
    pending: "Verificação pendente",
    barberRole: "Conta de barbeiro",
    customerRole: "Conta de cliente",
    noName: "Cliente Gold Mustache",
    noPhone: "Adicione um telefone para agilizar seus próximos atendimentos.",
    completionLabel: "Cadastro completo",
    nextAppointment: "Próximo atendimento",
    noUpcoming: "Nenhum horário futuro no momento.",
    pendingTitle: "Próximos passos",
    pendingNone: "Sua conta está pronta para os próximos agendamentos.",
    pendingVerification: "Confirmar o email",
    pendingPhone: "Adicionar telefone",
    pendingAddress: "Completar endereço",
  },
  quickActions: {
    title: "Ações rápidas",
    description: "Atalhos para o que você mais usa na sua rotina.",
    bookingLabel: "Agendar horário",
    bookingDescription: "Marque seu próximo atendimento",
    appointmentsLabel: "Meus agendamentos",
    appointmentsDescription: "Veja horários e histórico",
    exportLabel: "Exportar meus dados",
    exportDescription: "Baixe um arquivo com seus dados",
    securityLabel: "Segurança da conta",
    securityDescription: "Revise senha e verificação",
  },
  sections: {
    personal: {
      title: "Dados pessoais",
      description: "Informações básicas e endereço para referência.",
    },
    security: {
      title: "Saúde da conta",
      description: "Senha, verificação e sinais de segurança.",
    },
    privacy: {
      title: "Direitos e privacidade",
      description: "Acesse seus dados e entenda como sua conta é tratada.",
    },
    danger: {
      title: "Zona sensível",
      description: "Ações irreversíveis exigem confirmação adicional.",
    },
  },
  dataRights: {
    title: "Exportação LGPD",
    description:
      "Baixe um arquivo com os dados associados à sua conta em formato JSON.",
    exportButton: "Baixar meus dados",
  },
  appointment: {
    service: "Serviço",
    date: "Data",
    time: "Horário",
    barber: "Barbeiro",
  },
  personalInfo: {
    email: "Email de cadastro",
    phone: "Telefone principal",
  },
};

function translate(
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, translations);

  if (typeof value !== "string") {
    return key;
  }

  if (!params) {
    return value;
  }

  return value.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(params[token] ?? `{${token}}`),
  );
}

vi.mock("next-intl", () => ({
  useTranslations: () => translate,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useUser: () => mockUseUser(),
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => mockUseProfileMe(),
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => mockUseBarberProfile(),
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: () => mockUseDashboardStats(),
}));

vi.mock("@/providers/booking-settings-provider", () => ({
  useBookingSettings: () => mockUseBookingSettings(),
}));

vi.mock("@/components/private/PrivateHeaderContext", () => ({
  usePrivateHeader: (options: unknown) => mockUsePrivateHeader(options),
}));

vi.mock("@/components/profile/ProfileForm", () => ({
  ProfileForm: () => <div>ProfileFormMock</div>,
}));

vi.mock("@/components/profile/EmailVerificationCard", () => ({
  EmailVerificationCard: () => <div>EmailVerificationCardMock</div>,
}));

vi.mock("@/components/profile/PasswordChangeCard", () => ({
  PasswordChangeCard: () => <div>PasswordChangeCardMock</div>,
}));

vi.mock("@/components/profile/DeleteAccountCard", () => ({
  DeleteAccountCard: () => <div>DeleteAccountCardMock</div>,
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUser.mockReturnValue({
      data: { id: "user-1", email: "cliente@goldmustache.com" },
      isLoading: false,
    });

    mockUseProfileMe.mockReturnValue({
      data: {
        id: "profile-1",
        userId: "user-1",
        fullName: "João Silva",
        phone: "47999998888",
        avatarUrl: null,
        street: "Rua 115",
        number: "79",
        complement: null,
        neighborhood: "Centro",
        city: "Itapema",
        state: "SC",
        zipCode: "88220-000",
        emailVerified: true,
        role: "CLIENT",
        createdAt: "2026-03-09T00:00:00.000Z",
        updatedAt: "2026-03-09T00:00:00.000Z",
      },
      isLoading: false,
    });

    mockUseBarberProfile.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseDashboardStats.mockReturnValue({
      data: {
        role: "CLIENT",
        client: {
          nextAppointment: {
            id: "apt-1",
            date: "2026-03-20",
            startTime: "14:30",
            endTime: "15:15",
            barber: {
              id: "barber-1",
              name: "Vitor",
              avatarUrl: null,
            },
            service: {
              id: "service-1",
              name: "Corte + Barba",
              duration: 45,
              price: 100,
            },
          },
          upcomingCount: 1,
          totalVisits: 8,
          totalSpent: 620,
          favoriteBarber: null,
          favoriteService: null,
          lastService: null,
        },
        barber: null,
        admin: null,
      },
      isLoading: false,
    });

    mockUseBookingSettings.mockReturnValue({
      bookingHref: "/pt-BR/agendar",
      shouldShowBooking: true,
      isExternal: false,
      isInternal: true,
      isDisabled: false,
    });
  });

  it("shows loading spinner while profile data is loading", () => {
    mockUseProfileMe.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Carregando pelo locale...")).toBeInTheDocument();
  });

  it("renders the profile hub with identity hero, quick actions and sections", () => {
    mockUseBarberProfile.mockReturnValue({
      data: { id: "barber-1", name: "Vitor", avatarUrl: null },
      isLoading: false,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Ficha do cliente")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("cliente@goldmustache.com")).toBeInTheDocument();
    expect(screen.getByText("Email verificado")).toBeInTheDocument();
    expect(screen.getByText("Conta de barbeiro")).toBeInTheDocument();
    expect(screen.getByText("Próximo atendimento")).toBeInTheDocument();
    expect(screen.getByText("Corte + Barba")).toBeInTheDocument();
    expect(screen.getByText("Email de cadastro")).toBeInTheDocument();
    expect(screen.getByText("Telefone principal")).toBeInTheDocument();

    expect(screen.getByText("Ações rápidas")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /agendar horário/i }),
    ).toHaveAttribute("href", "/pt-BR/agendar");
    expect(
      screen.getByRole("link", { name: /meus agendamentos/i }),
    ).toHaveAttribute("href", "/pt-BR/meus-agendamentos");
    expect(
      screen.getByRole("link", { name: /exportar meus dados/i }),
    ).toHaveAttribute("href", "/api/profile/export");

    expect(screen.getByText("Dados pessoais")).toBeInTheDocument();
    expect(screen.getByText("Saúde da conta")).toBeInTheDocument();
    expect(screen.getByText("Direitos e privacidade")).toBeInTheDocument();
    expect(screen.getByText("Zona sensível")).toBeInTheDocument();

    expect(screen.getByText("ProfileFormMock")).toBeInTheDocument();
    expect(screen.getByText("EmailVerificationCardMock")).toBeInTheDocument();
    expect(screen.getByText("PasswordChangeCardMock")).toBeInTheDocument();
    expect(screen.getByText("DeleteAccountCardMock")).toBeInTheDocument();
  });

  it("renders pending states and hides booking shortcuts when booking is disabled", () => {
    mockUseProfileMe.mockReturnValue({
      data: {
        id: "profile-1",
        userId: "user-1",
        fullName: null,
        phone: null,
        avatarUrl: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        emailVerified: false,
        role: "CLIENT",
        createdAt: "2026-03-09T00:00:00.000Z",
        updatedAt: "2026-03-09T00:00:00.000Z",
      },
      isLoading: false,
    });

    mockUseDashboardStats.mockReturnValue({
      data: {
        role: "CLIENT",
        client: {
          nextAppointment: null,
          upcomingCount: 0,
          totalVisits: 0,
          totalSpent: 0,
          favoriteBarber: null,
          favoriteService: null,
          lastService: null,
        },
        barber: null,
        admin: null,
      },
      isLoading: false,
    });

    mockUseBookingSettings.mockReturnValue({
      bookingHref: null,
      shouldShowBooking: false,
      isExternal: false,
      isInternal: false,
      isDisabled: true,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Cliente Gold Mustache")).toBeInTheDocument();
    expect(screen.getByText("Verificação pendente")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Adicione um telefone para agilizar seus próximos atendimentos.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhum horário futuro no momento."),
    ).toBeInTheDocument();
    expect(screen.getByText("Confirmar o email")).toBeInTheDocument();
    expect(screen.getByText("Adicionar telefone")).toBeInTheDocument();
    expect(screen.getByText("Completar endereço")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /agendar horário/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /meus agendamentos/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps address as pending when only part of the address is filled", () => {
    mockUseProfileMe.mockReturnValue({
      data: {
        id: "profile-1",
        userId: "user-1",
        fullName: "João Silva",
        phone: "47999998888",
        avatarUrl: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: "Itapema",
        state: null,
        zipCode: null,
        emailVerified: true,
        role: "CLIENT",
        createdAt: "2026-03-09T00:00:00.000Z",
        updatedAt: "2026-03-09T00:00:00.000Z",
      },
      isLoading: false,
    });

    render(<ProfilePage />);

    expect(screen.getByText("Completar endereço")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
