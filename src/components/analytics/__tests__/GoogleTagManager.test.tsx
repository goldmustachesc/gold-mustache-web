import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "../GoogleTagManager";

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
  default: () => {
    throw new Error("script-fail");
  },
}));

describe("GoogleTagManager", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    consentMocks.hasConsent.mockImplementation(
      (k: string) => k === "analytics",
    );
    consentMocks.isLoading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza null quando boundary captura erro de script", () => {
    const { container } = render(<GoogleTagManager gtmId="GTM-1" />);

    expect(container.firstChild).toBeNull();
  });

  it("renderiza bloco noscript quando há id e consentimento", () => {
    const { container } = render(<GoogleTagManagerNoScript gtmId="GTM-99" />);

    expect(container.querySelector("noscript")).toBeTruthy();
  });

  it("omit noscript quando falta id ou consentimento", () => {
    const { container: emptyId } = render(
      <GoogleTagManagerNoScript gtmId="" />,
    );
    expect(emptyId.firstChild).toBeNull();

    consentMocks.hasConsent.mockReturnValue(false);
    const { container: noConsent } = render(
      <GoogleTagManagerNoScript gtmId="GTM-1" />,
    );
    expect(noConsent.firstChild).toBeNull();
  });
});
