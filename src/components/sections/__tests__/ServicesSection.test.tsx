import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServicesSection } from "../ServicesSection";
import { ServiceBookingButton } from "../ServiceBookingButton";

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

vi.mock("next-intl/server", () => ({
  getTranslations: (opts: { namespace: string }) => (key: string) =>
    `${opts.namespace}.${key}`,
  getLocale: () => Promise.resolve("pt-BR"),
}));

const mockSettings = vi.hoisted(() => ({
  bookingEnabled: true,
  externalBookingUrl: null,
}));

vi.mock("@/services/barbershop-settings", () => ({
  getBarbershopSettings: () => Promise.resolve(mockSettings),
}));

const mockServices = vi.hoisted(() => vi.fn());
vi.mock("@/services/booking", () => ({
  getPublicServicesWithCache: () => mockServices(),
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

vi.mock("@/constants/brand", () => ({
  BRAND: {
    featuredCombo: { originalPrice: 80, discountedPrice: 65 },
    instagram: { mainUrl: "https://instagram.com/test" },
  },
}));

describe("ServicesSection (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.bookingEnabled = true;
    mockSettings.externalBookingUrl = null;
  });

  it("mostra vazio quando não há serviços", async () => {
    mockServices.mockResolvedValue([]);

    await act(async () => {
      render(await ServicesSection());
    });

    expect(screen.getByText("services.empty")).toBeInTheDocument();
  });

  it("renderiza serviços com CTA de agendamento", async () => {
    mockServices.mockResolvedValue([
      {
        id: "service-1",
        slug: "corte-americano",
        name: "Corte Americano",
        description: "Descrição",
        price: 45,
        duration: 60,
        active: true,
      },
    ]);

    await act(async () => {
      render(await ServicesSection());
    });

    expect(screen.getByText("Corte Americano")).toBeInTheDocument();
    expect(screen.getByText(/45[,.]00/)).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("não mostra CTA de agendamento quando booking está desabilitado", async () => {
    mockSettings.bookingEnabled = false;
    mockServices.mockResolvedValue([
      {
        id: "service-1",
        slug: "corte-americano",
        name: "Corte Americano",
        description: null,
        price: 45,
        duration: 30,
        active: true,
      },
    ]);

    await act(async () => {
      render(await ServicesSection());
    });

    expect(
      screen.queryByRole("link", { name: /services.labels.book/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ServiceBookingButton", () => {
  it("renderiza link interno correto", () => {
    render(
      <ServiceBookingButton
        bookingHref="/pt-BR/agendar"
        isExternal={false}
        label="Agendar Corte"
      />,
    );
    const link = screen.getByRole("link", { name: /Agendar Corte/i });
    expect(link).toHaveAttribute("href", "/pt-BR/agendar");
    expect(link).not.toHaveAttribute("target");
  });

  it("renderiza link externo com target=_blank", () => {
    render(
      <ServiceBookingButton
        bookingHref="https://agenda.externa"
        isExternal={true}
        label="Agendar"
      />,
    );
    const link = screen.getByRole("link", { name: /Agendar/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
