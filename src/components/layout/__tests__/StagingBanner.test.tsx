import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StagingBanner } from "../StagingBanner";

const siteMocks = vi.hoisted(() => ({
  isProduction: false,
  environment: "staging" as "staging" | "development",
}));

vi.mock("@/config/site", () => ({
  siteConfig: {
    get isProduction() {
      return siteMocks.isProduction;
    },
    get environment() {
      return siteMocks.environment;
    },
  },
}));

describe("StagingBanner", () => {
  beforeEach(() => {
    siteMocks.isProduction = false;
    siteMocks.environment = "staging";
  });

  it("mostra aviso em staging e permite fechar", async () => {
    const user = userEvent.setup();
    render(<StagingBanner />);

    expect(screen.getByText(/STAGING/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fechar aviso/i }));

    expect(screen.queryByText(/STAGING/i)).not.toBeInTheDocument();
  });

  it("usa estilo de development fora de staging", () => {
    siteMocks.environment = "development";
    render(<StagingBanner />);

    expect(screen.getByText(/DEVELOPMENT/i)).toBeInTheDocument();
  });

  it("não renderiza em produção", () => {
    siteMocks.isProduction = true;
    const { container } = render(<StagingBanner />);

    expect(container.firstChild).toBeNull();
  });
});
