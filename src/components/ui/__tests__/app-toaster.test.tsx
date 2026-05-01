import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppToaster } from "../app-toaster";

const mocks = vi.hoisted(() => ({
  useTheme: vi.fn(),
  Toaster: vi.fn((_props?: unknown) => null),
  useMediaQuery: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => mocks.useTheme(),
}));

vi.mock("sonner", () => ({
  Toaster: (props: unknown) => mocks.Toaster(props),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: (q: string) => mocks.useMediaQuery(q),
}));

describe("AppToaster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useMediaQuery.mockReturnValue(false);
  });

  it("usa tema claro antes do mount", () => {
    mocks.useTheme.mockReturnValue({ resolvedTheme: "dark" });

    render(<AppToaster />);

    expect(mocks.Toaster).toHaveBeenCalledWith(
      expect.objectContaining({
        position: "bottom-right",
        theme: "light",
        closeButton: true,
      }),
    );
  });

  it("usa posição top-center em mobile", () => {
    mocks.useTheme.mockReturnValue({ resolvedTheme: "light" });
    mocks.useMediaQuery.mockReturnValue(true);

    render(<AppToaster />);

    expect(mocks.Toaster).toHaveBeenLastCalledWith(
      expect.objectContaining({ position: "top-center" }),
    );
  });

  it("sincroniza com tema dark após o effect", async () => {
    mocks.useTheme.mockReturnValue({ resolvedTheme: "dark" });

    render(<AppToaster />);

    expect(mocks.Toaster).toHaveBeenLastCalledWith(
      expect.objectContaining({
        theme: "dark",
      }),
    );
  });
});
