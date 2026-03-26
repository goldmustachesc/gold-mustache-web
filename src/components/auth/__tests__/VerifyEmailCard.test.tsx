import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerifyEmailCard } from "../VerifyEmailCard";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("email=user@test.com"),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `auth.verifyEmail.${key}`,
}));

const resendMock = vi.fn();

vi.mock("@/services/auth", () => ({
  authService: {
    resendConfirmationEmail: (...args: unknown[]) => resendMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("VerifyEmailCard", () => {
  beforeEach(() => {
    resendMock.mockResolvedValue(undefined);
    resendMock.mockClear();
  });

  it("reenvia email quando há endereço na query", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailCard locale="pt-BR" />);

    const resend = screen.getByRole("button", {
      name: "auth.verifyEmail.resend",
    });
    await user.click(resend);

    expect(resendMock).toHaveBeenCalledWith("user@test.com");
  });
});
