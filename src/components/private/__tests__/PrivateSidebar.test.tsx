import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateSidebar } from "../PrivateSidebar";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({
    children,
  }: {
    children: React.ReactNode;
    side?: string;
    className?: string;
  }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  SheetTitle: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span>{children}</span>,
}));

const mockSignOut = vi.fn();
const mockSignOutPending = vi.hoisted(() => ({ value: false }));
vi.mock("@/hooks/useAuth", () => ({
  useSignOut: () => ({
    mutate: mockSignOut,
    isPending: mockSignOutPending.value,
  }),
}));

const mockProfile = vi.hoisted(() => ({
  value: null as { role: string; fullName: string | null } | null,
}));
vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: mockProfile.value }),
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: null,
    shouldShowBooking: false,
    isExternal: false,
    isInternal: true,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt-BR/barbeiro",
  useParams: () => ({ locale: "pt-BR" }),
}));

vi.mock("next/image", () => ({
  default: function MockImage({ alt, ...props }: Record<string, unknown>) {
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    return <img alt={alt as string} {...props} />;
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

const mockFeatureFlags = vi.hoisted(() => ({
  value: {
    loyaltyProgram: true,
    referralProgram: true,
    eventsSection: true,
  },
}));

vi.mock("@/hooks/useFeatureFlags", () => ({
  useFeatureFlags: () => mockFeatureFlags.value,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">theme-toggle</button>,
}));

describe("PrivateSidebar", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    mockProfile.value = null;
    mockSignOutPending.value = false;
    mockSignOut.mockClear();
    defaultProps.onOpenChange.mockClear();
    mockFeatureFlags.value = {
      loyaltyProgram: true,
      referralProgram: true,
      eventsSection: true,
    };
  });

  it("renders barber nav items when role is BARBER", () => {
    mockProfile.value = { role: "BARBER", fullName: "João Silva" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Minha Agenda")).toBeInTheDocument();
    expect(screen.getByText("Meus Horários")).toBeInTheDocument();
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
  });

  it("renders client nav items when role is CLIENT", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Maria Santos" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Fidelidade")).toBeInTheDocument();
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();
    expect(screen.queryByText("Minha Agenda")).not.toBeInTheDocument();
  });

  it("shows admin section for ADMIN role", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin User" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByText("Administração")).toBeInTheDocument();
    expect(screen.getByText("Dados da Barbearia")).toBeInTheDocument();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
  });

  it("hides admin section for non-admin roles", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });

  it("renders logout button", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("calls signOut on logout click", async () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    render(<PrivateSidebar {...defaultProps} />);

    await userEvent.click(screen.getByText("Sair"));
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("renders brand logo and wordmark", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByAltText("Gold Mustache")).toBeInTheDocument();
    expect(screen.getByText("GOLD MUSTACHE")).toBeInTheDocument();
  });

  it("renders theme toggle", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.getByText("theme-toggle")).toBeInTheDocument();
  });

  it("hides Fidelidade nav item for CLIENT when loyaltyProgram flag is false", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Client" };
    mockFeatureFlags.value = {
      loyaltyProgram: false,
      referralProgram: false,
      eventsSection: false,
    };
    render(<PrivateSidebar {...defaultProps} />);

    expect(screen.queryByText("Fidelidade")).not.toBeInTheDocument();
  });
});
