import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamMemberImage } from "../TeamMemberImage";

vi.mock("next/image", () => ({
  default: ({ alt, onError }: { alt: string; onError?: () => void }) => (
    <button type="button" onClick={onError} aria-label={alt} />
  ),
}));

describe("TeamMemberImage", () => {
  it("renderiza imagem com alt acessível", () => {
    render(
      <div className="relative h-64 w-full">
        <TeamMemberImage
          src="/carlos.webp"
          alt="Carlos Silva"
          name="Carlos Silva"
        />
      </div>,
    );
    expect(
      screen.getByRole("button", { name: "Carlos Silva" }),
    ).toBeInTheDocument();
  });

  it("mostra fallback com iniciais quando a imagem falha", () => {
    render(
      <div className="relative h-64 w-full">
        <TeamMemberImage
          src="/carlos.webp"
          alt="Carlos Silva"
          name="Carlos Silva"
        />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Carlos Silva" }));
    expect(screen.getByText("CS")).toBeInTheDocument();
  });
});
