import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServicesSection } from "../ServicesSection";

const mocks = vi.hoisted(() => ({
  useBookingSettings: vi.fn(),
  useServices: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    target?: string;
    rel?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => mocks.useBookingSettings(),
}));

vi.mock("@/hooks/useBooking", () => ({
  useServices: () => mocks.useServices(),
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({
    children,
    title,
    description,
    badge,
  }: {
    children: ReactNode;
    title: string;
    description: string;
    badge: string;
  }) => (
    <section>
      <h2>{badge}</h2>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/components/shared/ResponsiveCardGrid", () => ({
  ResponsiveCardGrid: <T,>({
    items,
    keyExtractor,
    renderCard,
  }: {
    items: T[];
    keyExtractor: (item: T) => string;
    desktopCols: number;
    renderCard: (item: T) => ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={keyExtractor(item)}>{renderCard(item)}</div>
      ))}
    </div>
  ),
}));

describe("ServicesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: "/agendar",
      shouldShowBooking: true,
      isExternal: false,
    });
  });

  it("mostra loading enquanto serviços carregam", () => {
    mocks.useServices.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    render(<ServicesSection />);

    expect(screen.getByText("services.loading")).toBeInTheDocument();
    expect(screen.getByText("services.featured.title")).toBeInTheDocument();
  });

  it("mostra erro quando hook falha", () => {
    mocks.useServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    render(<ServicesSection />);

    expect(screen.getByText("services.error.title")).toBeInTheDocument();
    expect(screen.getByText("services.error.message")).toBeInTheDocument();
  });

  it("mostra vazio quando não há serviços", () => {
    mocks.useServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<ServicesSection />);

    expect(screen.getByText("services.empty")).toBeInTheDocument();
  });

  it("renderiza serviços com CTA de agendamento", () => {
    mocks.useServices.mockReturnValue({
      data: [
        {
          id: "service-1",
          slug: "corte-americano",
          name: "Corte Americano",
          description: "Descrição",
          price: 45,
          duration: 60,
        },
        {
          id: "service-2",
          slug: "sem-imagem",
          name: "Barba",
          description: null,
          price: 30,
          duration: 30,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<ServicesSection />);

    expect(screen.getByText("Corte Americano")).toBeInTheDocument();
    expect(screen.getByText("Barba")).toBeInTheDocument();
    expect(screen.getByText("R$ 45,00")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /services.featured.cta/i }),
    ).toHaveAttribute("href", "/agendar");
    expect(
      screen.getByRole("link", {
        name: /services.labels.book Corte Americano/i,
      }),
    ).toHaveAttribute("href", "/agendar");
  });

  it("passa props de link externo no CTA quando necessário", () => {
    mocks.useBookingSettings.mockReturnValue({
      bookingHref: "https://agenda.externa",
      shouldShowBooking: true,
      isExternal: true,
    });
    mocks.useServices.mockReturnValue({
      data: [
        {
          id: "service-1",
          slug: "corte-americano",
          name: "Corte Americano",
          description: "Descrição",
          price: 45,
          duration: 60,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<ServicesSection />);

    const featuredLink = screen.getByRole("link", {
      name: /services.featured.cta/i,
    });
    expect(featuredLink).toHaveAttribute("target", "_blank");
    expect(featuredLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
