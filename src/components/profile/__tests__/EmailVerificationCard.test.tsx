import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailVerificationCard } from "../EmailVerificationCard";

const mockResendEmail = vi.fn();

vi.mock("@/services/auth", () => ({
  authService: {
    resendConfirmationEmail: (...args: unknown[]) => mockResendEmail(...args),
  },
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastMocks.success, error: toastMocks.error },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    (
      ({
        "personalInfo.email": "Email traduzido",
      }) as Record<string, string>
    )[key] || (params ? `${key}:${JSON.stringify(params)}` : key),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EmailVerificationCard", () => {
  it("renders verified badge when isVerified is true", () => {
    render(<EmailVerificationCard email="test@test.com" isVerified={true} />);
    expect(screen.getByText("verified")).toBeInTheDocument();
  });

  it("renders pending badge when not verified", () => {
    render(<EmailVerificationCard email="test@test.com" isVerified={false} />);
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("calls resendConfirmationEmail and shows success toast", async () => {
    mockResendEmail.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<EmailVerificationCard email="test@test.com" isVerified={false} />);

    await user.click(screen.getByRole("button", { name: /sendButton/i }));

    await waitFor(() => {
      expect(mockResendEmail).toHaveBeenCalledWith("test@test.com");
    });
    expect(toastMocks.success).toHaveBeenCalledWith("success");
  });

  it("shows error toast on resend failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockResendEmail.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<EmailVerificationCard email="test@test.com" isVerified={false} />);

    await user.click(screen.getByRole("button", { name: /sendButton/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("error");
    });
  });

  it("disables resend button when no email", () => {
    render(<EmailVerificationCard email={undefined} isVerified={false} />);
    const button = screen.getByRole("button", { name: /sendButton/i });
    expect(button).toBeDisabled();
  });

  it("uses translated label for the email field in the pending state", () => {
    render(<EmailVerificationCard email="test@test.com" isVerified={false} />);

    expect(screen.getByText(/Email traduzido:/)).toBeInTheDocument();
  });
});
