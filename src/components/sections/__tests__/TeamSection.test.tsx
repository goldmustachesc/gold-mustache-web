import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TeamSection } from "../TeamSection";

vi.mock("next/image", () => ({
  default: ({ alt, onError }: { alt: string; onError?: () => void }) => (
    <button type="button" onClick={onError} aria-label={alt} />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  useLocale: () => "pt-BR",
}));

vi.mock("@/constants/team", () => ({
  TEAM_MEMBERS: [
    {
      id: "member-1",
      name: "Carlos Silva",
      image: "/carlos.webp",
      role: { "pt-BR": "Barbeiro", en: "Barber", es: "Barbero" },
      bio: {
        "pt-BR": "Especialista em degradê",
        en: "Fade specialist",
        es: "Especialista en fade",
      },
      experience: 8,
      specialties: {
        "pt-BR": ["Fade", "Barba"],
        en: ["Fade", "Beard"],
        es: ["Fade", "Barba"],
      },
    },
  ],
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

describe("TeamSection", () => {
  it("renderiza membro com conteúdo localizado", () => {
    render(<TeamSection />);

    expect(screen.getByText("team.badge")).toBeInTheDocument();
    expect(screen.getByText("Carlos Silva")).toBeInTheDocument();
    expect(screen.getByText("Barbeiro")).toBeInTheDocument();
    expect(screen.getByText("Especialista em degradê")).toBeInTheDocument();
    expect(screen.getByText("8 team.yearsExperience")).toBeInTheDocument();
    expect(screen.getByText("Fade")).toBeInTheDocument();
    expect(screen.getByText("Barba")).toBeInTheDocument();
  });

  it("mostra fallback com iniciais quando a imagem falha", () => {
    render(<TeamSection />);

    fireEvent.click(screen.getByRole("button", { name: "Carlos Silva" }));

    expect(screen.getByText("CS")).toBeInTheDocument();
  });
});
