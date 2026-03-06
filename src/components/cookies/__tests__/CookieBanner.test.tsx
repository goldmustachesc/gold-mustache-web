import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieBanner } from "../CookieBanner";

const mockAcceptAll = vi.fn().mockResolvedValue(undefined);
const mockRejectNonEssential = vi.fn().mockResolvedValue(undefined);

const stablePreferences = { analytics: false, marketing: false };

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({
    hasDecided: false,
    acceptAll: mockAcceptAll,
    rejectNonEssential: mockRejectNonEssential,
    isLoading: false,
    preferences: stablePreferences,
    updatePreferences: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "pt-BR",
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

describe("CookieBanner", () => {
  it("becomes visible after delay when not decided", async () => {
    render(<CookieBanner />);
    expect(screen.queryByText("Nós usamos cookies")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByText("Nós usamos cookies")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("calls acceptAll when clicking 'Aceitar todos'", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    vi.useFakeTimers();
    render(<CookieBanner />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();

    await user.click(screen.getByRole("button", { name: "Aceitar todos" }));

    await waitFor(() => {
      expect(mockAcceptAll).toHaveBeenCalled();
    });
  });

  it("calls rejectNonEssential when clicking 'Apenas essenciais'", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    vi.useFakeTimers();
    render(<CookieBanner />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    vi.useRealTimers();

    await user.click(screen.getByRole("button", { name: "Apenas essenciais" }));

    await waitFor(() => {
      expect(mockRejectNonEssential).toHaveBeenCalled();
    });
  });

  it("includes privacy policy link with locale", () => {
    render(<CookieBanner />);
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const link = screen.getByRole("link", {
      name: "Política de Privacidade",
    });
    expect(link).toHaveAttribute("href", "/pt-BR/politica-de-privacidade");
    vi.useRealTimers();
  });
});
