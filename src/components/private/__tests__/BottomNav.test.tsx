import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BottomNav } from "../BottomNav";
import { PrivateHeaderProvider } from "../PrivateHeaderContext";
import type { ReactNode } from "react";

const mockProfile = vi.hoisted(() => ({
  value: null as { role: string; fullName: string | null } | null,
}));

const mockBarberProfile = vi.hoisted(() => ({
  value: null as { id: string; name: string } | null,
  isLoading: false,
}));

const mockPathname = vi.hoisted(() => ({
  value: "/pt-BR/dashboard",
}));

const mockBookingSettings = vi.hoisted(() => ({
  value: {
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
  },
}));

vi.mock("@/hooks/useProfileMe", () => ({
  useProfileMe: () => ({ data: mockProfile.value }),
}));

vi.mock("@/hooks/useBarberProfile", () => ({
  useBarberProfile: () => ({
    data: mockBarberProfile.value,
    isLoading: mockBarberProfile.isLoading,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => mockBookingSettings.value,
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

function Wrapper({ children }: { children: ReactNode }) {
  return <PrivateHeaderProvider>{children}</PrivateHeaderProvider>;
}

describe("BottomNav", () => {
  beforeEach(() => {
    mockProfile.value = null;
    mockBarberProfile.value = null;
    mockBarberProfile.isLoading = false;
    mockPathname.value = "/pt-BR/dashboard";
    mockBookingSettings.value = {
      bookingHref: "/pt-BR/agendar",
      shouldShowBooking: true,
      isExternal: false,
    };
    mockFeatureFlags.value = {
      loyaltyProgram: true,
      referralProgram: true,
      eventsSection: true,
    };
  });

  it("renders barber navigation items for BARBER role", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Agendar")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Mais")).toBeInTheDocument();
  });

  it("usa /dashboard como entrada principal do barbeiro", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    mockPathname.value = "/pt-BR/dashboard";
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute(
      "href",
      "/pt-BR/dashboard",
    );
  });

  it("BARBER: o link Agendar aponta para /pt-BR/barbeiro/agendar", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByRole("link", { name: "Agendar" })).toHaveAttribute(
      "href",
      "/pt-BR/barbeiro/agendar",
    );
  });

  it("barber bottom nav does not contain duplicate routes", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("renders admin navigation items for ADMIN role with correct destinations", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin" };
    mockPathname.value = "/pt-BR/dashboard";
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
    expect(screen.getByText("Mais")).toBeInTheDocument();

    const homeLink = screen.getByRole("link", { name: "Início" });
    expect(homeLink).toHaveAttribute("href", "/pt-BR/dashboard");

    const teamLink = screen.getByRole("link", { name: "Equipe" });
    expect(teamLink).toHaveAttribute("href", "/pt-BR/admin/barbeiros");
  });

  it("usa a navegação de barbeiro quando ADMIN também tem barberProfile no dashboard", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin" };
    mockBarberProfile.value = { id: "barber-1", name: "Carlos" };
    mockPathname.value = "/pt-BR/dashboard";

    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByText("Agendar")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.queryByText("Equipe")).not.toBeInTheDocument();
    expect(screen.queryByText("Serviços")).not.toBeInTheDocument();
  });

  it("não renderiza navegação de admin enquanto o contexto de barbeiro ainda carrega", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin" };
    mockPathname.value = "/pt-BR/barbeiro/clientes";
    mockBarberProfile.value = null;
    mockBarberProfile.isLoading = true;

    const { container } = render(<BottomNav />, { wrapper: Wrapper });

    expect(container.firstChild).toBeNull();
  });

  it("mantém a navegação de admin fora do contexto de barbeiro mesmo com barberProfile", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin" };
    mockBarberProfile.value = { id: "barber-1", name: "Carlos" };
    mockPathname.value = "/pt-BR/admin/barbeiros";

    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByText("Serviços")).toBeInTheDocument();
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument();
  });

  it("admin bottom nav does not contain duplicate routes", () => {
    mockProfile.value = { role: "ADMIN", fullName: "Admin" };
    render(<BottomNav />, { wrapper: Wrapper });

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("renders client navigation items for CLIENT role", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Cliente" };
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Agendar")).toBeInTheDocument();
    expect(screen.getByText("Fidelidade")).toBeInTheDocument();
    expect(screen.getByText("Mais")).toBeInTheDocument();
  });

  it("omits the booking item when booking is disabled", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Cliente" };
    mockBookingSettings.value = {
      bookingHref: null,
      shouldShowBooking: false,
      isExternal: false,
    };

    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.queryByText("Agendar")).not.toBeInTheDocument();
  });

  it("renders external booking link when booking is external", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Cliente" };
    mockBookingSettings.value = {
      bookingHref: "https://agenda.externa.com",
      shouldShowBooking: true,
      isExternal: true,
    };

    render(<BottomNav />, { wrapper: Wrapper });

    const bookingLink = screen.getByRole("link", { name: "Agendar" });
    expect(bookingLink).toHaveAttribute("href", "https://agenda.externa.com");
    expect(bookingLink).toHaveAttribute("target", "_blank");
    expect(bookingLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides Fidelidade item for CLIENT when loyaltyProgram flag is false", () => {
    mockProfile.value = { role: "CLIENT", fullName: "Cliente" };
    mockFeatureFlags.value = {
      loyaltyProgram: false,
      referralProgram: false,
      eventsSection: false,
    };
    render(<BottomNav />, { wrapper: Wrapper });

    expect(screen.queryByText("Fidelidade")).not.toBeInTheDocument();
    expect(screen.getByText("Início")).toBeInTheDocument();
  });

  it("does not render when profile is not loaded", () => {
    mockProfile.value = null;
    const { container } = render(<BottomNav />, { wrapper: Wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("has lg:hidden class for desktop hiding", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    const nav = screen.getByRole("navigation", { name: /navegação/i });
    const wrapper = nav.parentElement;
    expect(wrapper?.className).toContain("lg:hidden");
  });

  it("highlights the active link based on pathname", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    const activeLink = screen.getByText("Início").closest("a");
    expect(activeLink?.className).toContain("text-primary");
  });

  it("does not highlight parent and child links at the same time", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    mockPathname.value = "/pt-BR/barbeiro/clientes";

    render(<BottomNav />, { wrapper: Wrapper });

    const homeLink = screen.getByText("Início").closest("a");
    const clientsLink = screen.getByText("Clientes").closest("a");

    expect(homeLink?.className).not.toContain("text-primary");
    expect(clientsLink?.className).toContain("text-primary");
  });

  it("renders 3 links plus 1 sidebar button", () => {
    mockProfile.value = { role: "BARBER", fullName: "João" };
    render(<BottomNav />, { wrapper: Wrapper });

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(screen.getByRole("button", { name: /mais/i })).toBeInTheDocument();
  });
});
