import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { RedemptionCode } from "../RedemptionCode";

const BASE_PROPS = {
  code: "ABC-1234-XYZ",
  status: "PENDING" as const,
  expiresAt: "2026-04-15T23:59:59.000Z",
};

describe("RedemptionCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render code in monospace font", () => {
    render(<RedemptionCode {...BASE_PROPS} />);

    const codeElement = screen.getByText("ABC-1234-XYZ");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.className).toMatch(/font-mono/);
  });

  it("should display badge 'status.pending' with amber styling when status is PENDING", () => {
    render(<RedemptionCode {...BASE_PROPS} status="PENDING" />);

    const badge = screen.getByText("status.pending");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/amber|yellow/);
  });

  it("should display badge 'status.used' with green styling when status is USED", () => {
    render(<RedemptionCode {...BASE_PROPS} status="USED" />);

    const badge = screen.getByText("status.used");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/green|emerald/);
  });

  it("should display badge 'status.expired' with muted styling when status is EXPIRED", () => {
    render(<RedemptionCode {...BASE_PROPS} status="EXPIRED" />);

    const badge = screen.getByText("status.expired");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/zinc|muted|gray/);
  });

  it("should copy code to clipboard when copy button is clicked", async () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(<RedemptionCode {...BASE_PROPS} />);

    const copyButton = screen.getByRole("button", { name: /copyCode/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextSpy).toHaveBeenCalledWith("ABC-1234-XYZ");
  });

  it("should display formatted expiry date", () => {
    render(<RedemptionCode {...BASE_PROPS} />);

    expect(screen.getByText(/15\/04\/2026/)).toBeInTheDocument();
  });
});
