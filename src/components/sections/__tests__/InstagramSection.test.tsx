import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstagramSection } from "../InstagramSection";

const apiGetMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

vi.mock("@/constants/brand", () => ({
  BRAND: {
    instagram: {
      mainUrl: "https://instagram.com/main",
      storeUrl: "https://instagram.com/store",
    },
  },
}));

vi.mock("@/components/shared/RevealOnScroll", () => ({
  RevealOnScroll: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/SectionLayout", () => ({
  SectionLayout: ({
    children,
    badge,
    title,
    titleAccent,
    description,
  }: {
    children: ReactNode;
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
  }) => (
    <section>
      <span>{badge}</span>
      <span>{title}</span>
      <span>{titleAccent}</span>
      <span>{description}</span>
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
    renderCard: (item: T, index: number) => ReactNode;
  }) => (
    <div>
      {items.map((item, index) => (
        <div key={keyExtractor(item)}>{renderCard(item, index)}</div>
      ))}
    </div>
  ),
}));

describe("InstagramSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa posts da API quando a resposta tem itens", async () => {
    apiGetMock.mockResolvedValue({
      posts: [
        {
          id: "api-1",
          image: "/api.jpg",
          caption: "API caption",
          url: "https://instagram.com/p/api",
        },
      ],
    });

    render(<InstagramSection />);

    await waitFor(() => {
      expect(screen.getByText("API caption")).toBeInTheDocument();
    });
    expect(apiGetMock).toHaveBeenCalledWith("/api/instagram/posts");
  });

  it("usa fallback mock quando API retorna lista vazia", async () => {
    apiGetMock.mockResolvedValue({ posts: [] });

    render(<InstagramSection />);

    await waitFor(() => {
      expect(
        screen.getByText(/Agenda aberta para transformar/i),
      ).toBeInTheDocument();
    });
  });

  it("usa fallback mock quando API falha e em dev loga warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    apiGetMock.mockRejectedValue(new Error("network"));

    render(<InstagramSection />);

    await waitFor(() => {
      expect(
        screen.getByText(/Agenda aberta para transformar/i),
      ).toBeInTheDocument();
    });
    expect(warnSpy).toHaveBeenCalled();

    process.env.NODE_ENV = prevEnv;
    warnSpy.mockRestore();
  });

  it("abre post no window.open ao clicar em ver no instagram", async () => {
    apiGetMock.mockResolvedValue({
      posts: [
        {
          id: "x",
          image: "/x.jpg",
          caption: "Short",
          url: "https://instagram.com/p/x/",
        },
      ],
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<InstagramSection />);

    await waitFor(() => {
      expect(screen.getByText("Short")).toBeInTheDocument();
    });

    const viewBtn = screen.getByRole("button", {
      name: /instagram.viewOnInstagram/i,
    });
    fireEvent.click(viewBtn);

    expect(openSpy).toHaveBeenCalledWith(
      "https://instagram.com/p/x/",
      "_blank",
    );
    openSpy.mockRestore();
  });
});
