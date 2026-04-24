import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

const storageData = new Map<string, string>();

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

function installLocalStorageMock(): void {
  const localStorageMock = {
    getItem(key: string): string | null {
      return storageData.get(String(key)) ?? null;
    },
    setItem(key: string, value: string): void {
      storageData.set(String(key), String(value));
    },
    removeItem(key: string): void {
      storageData.delete(String(key));
    },
    clear(): void {
      storageData.clear();
    },
    key(index: number): string | null {
      return Array.from(storageData.keys())[index] ?? null;
    },
    get length(): number {
      return storageData.size;
    },
  } satisfies Storage;

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  }
}

installLocalStorageMock();

beforeEach(() => {
  storageData.clear();
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
