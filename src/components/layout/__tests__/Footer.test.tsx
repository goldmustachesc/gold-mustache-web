import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Footer } from "../Footer";

vi.mock("@/hooks/useBookingSettings", () => ({
  useBookingSettings: () => ({
    bookingHref: "/pt-BR/agendar",
    shouldShowBooking: true,
    isExternal: false,
  }),
}));

vi.mock("@/constants/brand", () => ({
  BRAND: {
    instagram: {
      mainUrl: "https://instagram.com/goldmustachebarbearia",
      storeUrl: "https://instagram.com/_goldlab",
      main: "@goldmustachebarbearia",
    },
    contact: {
      phone: "47 98904-6178",
      whatsapp: "+5547989046178",
      email: "goldmustachesc@gmail.com",
      address: "R. 115, 79 - Centro, Itapema - SC",
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Gold+Mustache+Barbearia+Itapema",
    },
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
  useTranslations: (ns: string) => {
    const keys: Record<string, Record<string, string>> = {
      footer: {
        description: "Barbearia tradicional em Itapema.",
        "sections.contact": "Contato",
        "links.privacy": "Política de Privacidade",
        "links.barbershop": "Barbearia",
        "links.store": "Loja",
        "links.book": "Agendar Horário",
        copyright: "Gold Mustache Barbearia. Todos os direitos reservados.",
        "hours.title": "Horário de Funcionamento",
        "hours.weekdays": "Segunda a Sexta",
        "hours.saturday": "Sábado",
        "hours.sunday": "Domingo",
        "hours.weekdaysTime": "10h às 20h",
        "hours.saturdayTime": "10h às 20h",
        "hours.sundayStatus": "Fechado",
      },
      brand: {
        tagline: "Tradição e Estilo Masculino",
        location: "Itapema, Santa Catarina",
      },
    };
    return (key: string) => keys[ns]?.[key] ?? key;
  },
}));

vi.mock("next/image", () => ({
  // biome-ignore lint/performance/noImgElement: Test mock must use plain <img> — not a real render
  default: (props: Record<string, unknown>) => (
    <img
      alt={props.alt as string}
      src={props.src as string}
      data-testid="next-image"
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a {...props}>{children}</a>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Footer", () => {
  it("renders the brand name and tagline", () => {
    render(<Footer />);
    expect(screen.getByText("Gold Mustache")).toBeInTheDocument();
    expect(screen.getByText("Tradição e Estilo Masculino")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<Footer />);
    expect(
      screen.getByText("Barbearia tradicional em Itapema."),
    ).toBeInTheDocument();
  });

  it("renders the contact address", () => {
    render(<Footer />);
    expect(
      screen.getByText("R. 115, 79 - Centro, Itapema - SC"),
    ).toBeInTheDocument();
  });

  it("renders address as a Google Maps link", () => {
    render(<Footer />);
    const mapLink = screen.getByRole("link", {
      name: /R\. 115, 79/,
    });
    expect(mapLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=Gold+Mustache+Barbearia+Itapema",
    );
    expect(mapLink).toHaveAttribute("target", "_blank");
  });

  it("renders phone number", () => {
    render(<Footer />);
    expect(screen.getByText("47 98904-6178")).toBeInTheDocument();
  });

  it("renders business hours from i18n", () => {
    render(<Footer />);
    expect(screen.getByText("Horário de Funcionamento")).toBeInTheDocument();
    expect(screen.getByText("Segunda a Sexta")).toBeInTheDocument();
    expect(screen.getAllByText("10h às 20h").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fechado")).toBeInTheDocument();
  });

  it("renders Instagram social links that open in new tab", () => {
    render(<Footer />);
    const barbershopLink = screen.getByRole("link", { name: /Barbearia/i });
    expect(barbershopLink).toHaveAttribute(
      "href",
      "https://instagram.com/goldmustachebarbearia",
    );
    expect(barbershopLink).toHaveAttribute("target", "_blank");

    const storeLink = screen.getByRole("link", { name: /Loja/i });
    expect(storeLink).toHaveAttribute("href", "https://instagram.com/_goldlab");
    expect(storeLink).toHaveAttribute("target", "_blank");
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
    expect(
      screen.getByText(/Gold Mustache Barbearia\. Todos os direitos/),
    ).toBeInTheDocument();
  });

  it("renders privacy policy link with locale prefix", () => {
    render(<Footer />);
    const privacyLink = screen.getByRole("link", {
      name: "Política de Privacidade",
    });
    expect(privacyLink).toHaveAttribute(
      "href",
      "/pt-BR/politica-de-privacidade",
    );
  });

  it("renders location in bottom strip", () => {
    render(<Footer />);
    expect(screen.getByText("Itapema, Santa Catarina")).toBeInTheDocument();
  });

  it("renders booking link when booking is enabled", () => {
    render(<Footer />);
    const bookingLink = screen.getByRole("link", {
      name: /Agendar Horário/,
    });
    expect(bookingLink).toHaveAttribute("href", "/pt-BR/agendar");
  });

  it("uses semantic footer element with gold accent border", () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector("footer");
    expect(footer).toBeInTheDocument();
    expect(footer?.className).toMatch(/border-t/);
    expect(footer?.className).toMatch(/border-primary/);
  });
});
