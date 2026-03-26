import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useMediaQuery, useIsDesktop } from "../useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Array<(event: MediaQueryListEvent) => void> = [];
  let mockMatches = false;

  const mockMatchMedia = vi.fn((query: string) => ({
    matches: mockMatches,
    media: query,
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (
      _: string,
      cb: (event: MediaQueryListEvent) => void,
    ) => {
      listeners = listeners.filter((l) => l !== cb);
    },
  }));

  beforeEach(() => {
    listeners = [];
    mockMatches = false;
    vi.stubGlobal("matchMedia", mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna false inicialmente quando query não corresponde", () => {
    mockMatches = false;
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(false);
  });

  it("retorna true quando query corresponde", () => {
    mockMatches = true;
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(true);
  });

  it("atualiza quando media query muda", () => {
    mockMatches = false;
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(false);

    act(() => {
      for (const cb of listeners) {
        cb({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("limpa listener ao desmontar", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });
});

describe("useIsDesktop", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa query de lg breakpoint (1024px)", () => {
    const matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMedia);

    renderHook(() => useIsDesktop());

    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });
});
