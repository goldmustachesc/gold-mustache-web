import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppToaster } from "../app-toaster";

const mocks = vi.hoisted(() => ({
  useTheme: vi.fn(),
  Toaster: vi.fn(() => null),
}));

vi.mock("next-themes", () => ({
  useTheme: () => mocks.useTheme(),
}));

vi.mock("sonner", () => ({
  Toaster: (props: unknown) => mocks.Toaster(props),
}));

describe("AppToaster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa tema claro antes do mount", () => {
    mocks.useTheme.mockReturnValue({ resolvedTheme: "dark" });

    render(<AppToaster />);

    expect(mocks.Toaster).toHaveBeenCalledWith(
      expect.objectContaining({
        position: "bottom-center",
        theme: "light",
        closeButton: true,
      }),
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
