import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInstagramCache } from "@/lib/instagram-cache";
import { InstagramPostCard } from "../InstagramPostCard";
import { InstagramSection } from "../InstagramSection";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

vi.mock("@/lib/instagram-cache", () => ({
  getInstagramCache: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("pt-BR"),
  getTranslations: () => Promise.resolve((key: string) => `instagram.${key}`),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
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

const mockedGetInstagramCache = vi.mocked(getInstagramCache);

describe("InstagramSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa posts do cache quando há itens", async () => {
    mockedGetInstagramCache.mockResolvedValue({
      posts: [
        {
          id: "api-1",
          image: "/api.jpg",
          caption: "API caption",
          url: "https://instagram.com/p/api",
        },
      ],
      lastUpdated: new Date().toISOString(),
      source: "api",
    });

    await act(async () => {
      render(await InstagramSection());
    });

    expect(screen.getByText("API caption")).toBeInTheDocument();
    expect(mockedGetInstagramCache).toHaveBeenCalled();
  });

  it("usa fallback mock quando cache está vazio", async () => {
    mockedGetInstagramCache.mockResolvedValue({
      posts: [],
      lastUpdated: new Date().toISOString(),
      source: "mock",
    });

    await act(async () => {
      render(await InstagramSection());
    });

    expect(
      screen.getByText(/Agenda aberta para transformar/i),
    ).toBeInTheDocument();
  });

  it("usa fallback mock quando leitura do cache falha", async () => {
    mockedGetInstagramCache.mockRejectedValue(new Error("redis"));

    await act(async () => {
      render(await InstagramSection());
    });

    expect(
      screen.getByText(/Agenda aberta para transformar/i),
    ).toBeInTheDocument();
  });
});

describe("InstagramPostCard", () => {
  it("renderiza imagem do post", () => {
    render(
      <InstagramPostCard
        post={{
          id: "1",
          image: "/test.jpg",
          caption: "Caption text",
          url: "https://instagram.com/p/1/",
        }}
        viewLabel="Ver no Instagram"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Instagram post" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Caption text")).toBeInTheDocument();
  });

  it("abre post no window.open ao clicar no botão", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <InstagramPostCard
        post={{
          id: "x",
          image: "/x.jpg",
          caption: "Short",
          url: "https://instagram.com/p/x/",
        }}
        viewLabel="Ver no Instagram"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver no Instagram" }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://instagram.com/p/x/",
      "_blank",
    );
    openSpy.mockRestore();
  });
});
