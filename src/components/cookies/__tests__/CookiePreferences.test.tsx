import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookiePreferences } from "../CookiePreferences";

const mockUpdatePreferences = vi.fn().mockResolvedValue(undefined);

const stablePreferences = { analytics: false, marketing: false };

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({
    preferences: stablePreferences,
    updatePreferences: mockUpdatePreferences,
    isLoading: false,
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CookiePreferences", () => {
  it("returns null when not open", () => {
    const { container } = render(
      <CookiePreferences isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when open", () => {
    render(<CookiePreferences isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Preferências de Cookies")).toBeInTheDocument();
  });

  it("shows essential category as always active", () => {
    render(<CookiePreferences isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText("Sempre ativo")).toBeInTheDocument();
  });

  it("calls updatePreferences with current state on save", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CookiePreferences isOpen={true} onClose={onClose} />);

    await user.click(
      screen.getByRole("button", { name: /salvar preferências/i }),
    );

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        analytics: false,
        marketing: false,
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls updatePreferences with all true on 'Aceitar todos'", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CookiePreferences isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /aceitar todos/i }));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        analytics: true,
        marketing: true,
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls updatePreferences with all false on 'Rejeitar todos'", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CookiePreferences isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /rejeitar todos/i }));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({
        analytics: false,
        marketing: false,
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on X button click", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CookiePreferences isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /fechar/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
