import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordChangeCard } from "../PasswordChangeCard";

const mockUpdatePassword = vi.fn();

vi.mock("@/services/auth", () => ({
  authService: {
    updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
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
  useTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PasswordChangeCard", () => {
  it("shows validation error for empty new password", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.click(screen.getByRole("button", { name: /button/i }));

    expect(screen.getByText("validation.required")).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows validation error for password shorter than 6 chars", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.type(screen.getByLabelText(/newPassword$/), "12345");
    await user.type(screen.getByLabelText(/confirmPassword/), "12345");
    await user.click(screen.getByRole("button", { name: /button/i }));

    expect(screen.getByText("validation.minLength")).toBeInTheDocument();
  });

  it("shows validation error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.type(screen.getByLabelText(/newPassword$/), "password1");
    await user.type(screen.getByLabelText(/confirmPassword/), "different");
    await user.click(screen.getByRole("button", { name: /button/i }));

    expect(screen.getByText("validation.mismatch")).toBeInTheDocument();
  });

  it("calls authService.updatePassword on valid submission", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.type(screen.getByLabelText(/newPassword$/), "newpass123");
    await user.type(screen.getByLabelText(/confirmPassword/), "newpass123");
    await user.click(screen.getByRole("button", { name: /button/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith("newpass123");
    });
    expect(toastMocks.success).toHaveBeenCalledWith("success");
  });

  it("shows success state after password change", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.type(screen.getByLabelText(/newPassword$/), "newpass123");
    await user.type(screen.getByLabelText(/confirmPassword/), "newpass123");
    await user.click(screen.getByRole("button", { name: /button/i }));

    await waitFor(() => {
      expect(screen.getByText("success")).toBeInTheDocument();
    });
  });

  it("shows error toast on failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockUpdatePassword.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<PasswordChangeCard />);

    await user.type(screen.getByLabelText(/newPassword$/), "newpass123");
    await user.type(screen.getByLabelText(/confirmPassword/), "newpass123");
    await user.click(screen.getByRole("button", { name: /button/i }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("error");
    });
  });
});
