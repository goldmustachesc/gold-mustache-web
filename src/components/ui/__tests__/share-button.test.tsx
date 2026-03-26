import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "../share-button";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa navigator.share quando disponível", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    render(<ShareButton title="Gold" url="https://gold.com" />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(share).toHaveBeenCalledWith({
      title: "Gold",
      url: "https://gold.com",
    });
  });

  it("copia link para clipboard quando web share não existe", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    let resetCopied: (() => void) | undefined;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        resetCopied = callback;
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    render(<ShareButton title="Gold" url="https://gold.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("https://gold.com");

    act(() => {
      resetCopied?.();
    });

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("engole erro de clipboard sem quebrar a UI", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<ShareButton title="Gold" url="https://gold.com" />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });
});
