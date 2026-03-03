import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockValidateReferral = vi.hoisted(() => vi.fn());
const mockApplyReferral = vi.hoisted(() => vi.fn());
const mockUseLoyaltyAccount = vi.hoisted(() => vi.fn());
const mockUseValidateReferral = vi.hoisted(() => vi.fn());
const mockUseApplyReferral = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useLoyalty", () => ({
  useLoyaltyAccount: (...args: unknown[]) => mockUseLoyaltyAccount(...args),
  useValidateReferral: (...args: unknown[]) => mockUseValidateReferral(...args),
  useApplyReferral: (...args: unknown[]) => mockUseApplyReferral(...args),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, params?: Record<string, string | number>) => {
      if (!params || Object.keys(params).length === 0) return key;
      const suffix = Object.values(params).join(", ");
      return `${key}: ${suffix}`;
    },
}));

import LoyaltyReferralPage from "../page";

function setupDefaultMocks(overrides?: {
  referredById?: string | null;
  referralsCount?: number;
  validateState?: {
    data?: { valid: boolean; referrerName: string } | null;
    isPending?: boolean;
    isError?: boolean;
    error?: Error | null;
  };
  applyState?: {
    data?: { applied: boolean; referrerName: string } | null;
    isPending?: boolean;
    isSuccess?: boolean;
    isError?: boolean;
    error?: Error | null;
  };
}) {
  mockUseLoyaltyAccount.mockReturnValue({
    data: {
      referralCode: "ABC123",
      currentPoints: 500,
      referredById: overrides?.referredById ?? null,
      referralsCount: overrides?.referralsCount ?? 3,
    },
    isLoading: false,
  });

  mockUseValidateReferral.mockReturnValue({
    mutate: mockValidateReferral,
    isPending: overrides?.validateState?.isPending ?? false,
    isError: overrides?.validateState?.isError ?? false,
    error: overrides?.validateState?.error ?? null,
    data: overrides?.validateState?.data ?? null,
  });

  mockUseApplyReferral.mockReturnValue({
    mutate: mockApplyReferral,
    isPending: overrides?.applyState?.isPending ?? false,
    isSuccess: overrides?.applyState?.isSuccess ?? false,
    isError: overrides?.applyState?.isError ?? false,
    error: overrides?.applyState?.error ?? null,
    data: overrides?.applyState?.data ?? null,
  });
}

describe("LoyaltyReferralPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("should render the referralCode from account", () => {
    render(<LoyaltyReferralPage />);

    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("should copy referralCode to clipboard when copy button is clicked", () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(<LoyaltyReferralPage />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    expect(writeTextSpy).toHaveBeenCalledWith("ABC123");
  });

  it("should render the 'referred by' section with input and validate button", () => {
    render(<LoyaltyReferralPage />);

    expect(screen.getByText("referredByTitle")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("referredByPlaceholder"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /validate/i }),
    ).toBeInTheDocument();
  });

  it("should disable 'referred by' section when referredById is set", () => {
    setupDefaultMocks({ referredById: "ref-123" });
    render(<LoyaltyReferralPage />);

    expect(screen.getByText("alreadyReferred")).toBeInTheDocument();

    const input = screen.queryByPlaceholderText("referredByPlaceholder");
    expect(input).not.toBeInTheDocument();
  });

  it("should show partial referrer name after successful validation", () => {
    setupDefaultMocks({
      validateState: {
        data: { valid: true, referrerName: "João S." },
      },
    });
    render(<LoyaltyReferralPage />);

    expect(screen.getByText(/João S\./)).toBeInTheDocument();
  });

  it("should show error when code is invalid", () => {
    setupDefaultMocks({
      validateState: {
        isError: true,
        error: new Error("Código de indicação não encontrado"),
      },
    });
    render(<LoyaltyReferralPage />);

    expect(
      screen.getByText("Código de indicação não encontrado"),
    ).toBeInTheDocument();
  });

  it("should show error when code is from own user", () => {
    setupDefaultMocks({
      validateState: {
        isError: true,
        error: new Error("Você não pode usar seu próprio código de indicação"),
      },
    });
    render(<LoyaltyReferralPage />);

    expect(
      screen.getByText("Você não pode usar seu próprio código de indicação"),
    ).toBeInTheDocument();
  });

  it("should display the referrals count", () => {
    render(<LoyaltyReferralPage />);

    const el = screen.getByTestId("referrals-count");
    expect(el).toHaveTextContent("3");
  });

  it("should have a WhatsApp share button with correct URL", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    const user = userEvent.setup();

    render(<LoyaltyReferralPage />);

    const shareButton = screen.getByRole("button", {
      name: /shareWhatsApp/i,
    });
    await user.click(shareButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
    );
    const url = windowOpenSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain("ABC123");

    windowOpenSpy.mockRestore();
  });

  describe("apply referral flow", () => {
    it("should show confirm button after successful validation", () => {
      setupDefaultMocks({
        validateState: {
          data: { valid: true, referrerName: "João S." },
        },
      });
      render(<LoyaltyReferralPage />);

      expect(
        screen.getByRole("button", { name: /confirmReferral/i }),
      ).toBeInTheDocument();
    });

    it("should not show confirm button before validation", () => {
      setupDefaultMocks();
      render(<LoyaltyReferralPage />);

      expect(
        screen.queryByRole("button", { name: /confirmReferral/i }),
      ).not.toBeInTheDocument();
    });

    it("should call useApplyReferral with the code when confirm is clicked", async () => {
      setupDefaultMocks({
        validateState: {
          data: { valid: true, referrerName: "João S." },
        },
      });
      const user = userEvent.setup();
      render(<LoyaltyReferralPage />);

      const input = screen.getByPlaceholderText("referredByPlaceholder");
      await user.type(input, "REF123");

      const confirmButton = screen.getByRole("button", {
        name: /confirmReferral/i,
      });
      await user.click(confirmButton);

      expect(mockApplyReferral).toHaveBeenCalledWith("REF123");
    });

    it("should show success message after apply succeeds", () => {
      setupDefaultMocks({
        validateState: {
          data: { valid: true, referrerName: "João S." },
        },
        applyState: {
          isSuccess: true,
          data: { applied: true, referrerName: "João S." },
        },
      });
      render(<LoyaltyReferralPage />);

      expect(screen.getByText(/referralApplied/i)).toBeInTheDocument();
    });

    it("should disable referred-by section when referredById is already set", () => {
      setupDefaultMocks({ referredById: "ref-123" });
      render(<LoyaltyReferralPage />);

      expect(screen.getByText("alreadyReferred")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /confirmReferral/i }),
      ).not.toBeInTheDocument();
    });
  });
});
