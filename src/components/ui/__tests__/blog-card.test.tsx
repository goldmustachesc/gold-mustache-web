import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { BlogPost } from "@/constants/blog";
import { BlogCard } from "../blog-card";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img data-testid="blog-img" alt={alt} src={src} />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const post: BlogPost = {
  slug: "cuidados-barba",
  image: "/images/blog/barba.svg",
  category: "barba",
  readTime: 5,
  publishedAt: "2025-12-01",
  author: "Gold",
};

describe("BlogCard", () => {
  it("renderiza card em destaque com link e prioridade implícita no mock", () => {
    render(<BlogCard post={post} locale="pt-BR" featured />);

    const link = screen.getByRole("link", {
      name: /posts\.cuidados-barba\.title/i,
    });
    expect(link).toHaveAttribute("href", "/pt-BR/blog/cuidados-barba");
    expect(screen.getByText("categories.barba")).toBeInTheDocument();
    expect(link.textContent).toContain("readTime");
    expect(link.textContent).toMatch(/5\s+readTime/);
  });

  it("renderiza card padrão com layout compacto", () => {
    render(<BlogCard post={post} locale="pt-BR" />);

    const link = screen.getByRole("link", {
      name: /posts\.cuidados-barba\.title/i,
    });
    expect(link).toHaveAttribute("href", "/pt-BR/blog/cuidados-barba");
    expect(screen.getAllByTestId("blog-img").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("readMore")).toBeInTheDocument();
  });
});
