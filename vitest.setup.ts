import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

function formatConsoleArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) {
        return arg.stack || arg.message || String(arg);
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    throw new Error(
      `[Unexpected console.error] ${formatConsoleArgs(args) || "(no message)"}`,
    );
  });

  vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    throw new Error(
      `[Unexpected console.warn] ${formatConsoleArgs(args) || "(no message)"}`,
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
