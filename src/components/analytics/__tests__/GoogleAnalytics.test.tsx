import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAnalytics,
  trackBookingClick,
  trackEvent,
  trackInstagramClick,
  trackPhoneClick,
  trackServiceView,
  trackWhatsappClick,
} from "../GoogleAnalytics";

const consentMocks = vi.hoisted(() => ({
  hasConsent: vi.fn((k: string) => k === "analytics"),
  isLoading: false,
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({
    hasConsent: consentMocks.hasConsent,
    isLoading: consentMocks.isLoading,
  }),
}));

vi.mock("next/script", () => ({
  default: (props: { id?: string; src?: string }) => (
    <div data-testid={props.id ?? "script"} data-src={props.src ?? ""} />
  ),
}));

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    consentMocks.hasConsent.mockReset();
    consentMocks.hasConsent.mockImplementation(
      (k: string) => k === "analytics",
    );
    consentMocks.isLoading = false;
  });

  it("não renderiza enquanto carrega consentimento", () => {
    consentMocks.isLoading = true;
    render(<GoogleAnalytics trackingId="G-1" />);
    expect(screen.queryByTestId("script")).not.toBeInTheDocument();
  });

  it("não renderiza sem trackingId", () => {
    consentMocks.isLoading = false;
    render(<GoogleAnalytics trackingId="" />);
    expect(screen.queryByTestId("script")).not.toBeInTheDocument();
  });

  it("não renderiza sem consentimento de analytics", () => {
    consentMocks.isLoading = false;
    consentMocks.hasConsent.mockReturnValue(false);
    render(<GoogleAnalytics trackingId="G-1" />);
    expect(screen.queryByTestId("script")).not.toBeInTheDocument();
  });

  it("injeta scripts quando consentimento e id existem", () => {
    render(<GoogleAnalytics trackingId="G-XYZ" />);

    const scripts = screen.getAllByTestId("script");
    expect(
      scripts.some((el) =>
        (el.getAttribute("data-src") ?? "").includes("googletagmanager"),
      ),
    ).toBe(true);
    expect(screen.getByTestId("google-analytics")).toBeInTheDocument();
  });
});

describe("trackEvent helpers", () => {
  it("chama gtag quando disponível no window", () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);

    trackEvent("a", "c", "l", 3);
    trackBookingClick();
    trackInstagramClick("main");
    trackInstagramClick("store");
    trackPhoneClick();
    trackWhatsappClick();
    trackServiceView("Corte");

    expect(gtag).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("ignora quando gtag não existe", () => {
    vi.stubGlobal("gtag", undefined);

    expect(() => trackEvent("x", "y")).not.toThrow();

    vi.unstubAllGlobals();
  });
});
