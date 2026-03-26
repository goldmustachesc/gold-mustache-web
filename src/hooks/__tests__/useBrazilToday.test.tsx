import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockGetBrazilDateString = vi.hoisted(() =>
  vi.fn().mockReturnValue("2026-03-05"),
);
const mockParseDateString = vi.hoisted(() =>
  vi.fn((str: string) => new Date(`${str}T00:00:00`)),
);

vi.mock("@/utils/time-slots", () => ({
  getBrazilDateString: mockGetBrazilDateString,
  parseDateString: mockParseDateString,
}));

import { useBrazilToday } from "../useBrazilToday";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useBrazilToday", () => {
  it("returns a Date object on mount", () => {
    const { result } = renderHook(() => useBrazilToday());
    expect(result.current).toBeInstanceOf(Date);
  });

  it("calls getBrazilDateString for initial value", () => {
    renderHook(() => useBrazilToday());
    expect(mockGetBrazilDateString).toHaveBeenCalled();
  });

  it("calls parseDateString with the result of getBrazilDateString", () => {
    renderHook(() => useBrazilToday());
    expect(mockParseDateString).toHaveBeenCalledWith("2026-03-05");
  });

  it("schedules a timer for midnight update", () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    renderHook(() => useBrazilToday());
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("cleans up timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { unmount } = renderHook(() => useBrazilToday());
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
