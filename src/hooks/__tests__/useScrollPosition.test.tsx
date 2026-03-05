import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollPosition } from "../useScrollPosition";

afterEach(() => {
  vi.restoreAllMocks();
});

function fireScroll(scrollY: number) {
  Object.defineProperty(window, "scrollY", { value: scrollY, writable: true });
  window.dispatchEvent(new Event("scroll"));
}

describe("useScrollPosition", () => {
  it("returns scrollY: 0 and isScrolledPastThreshold: false initially", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useScrollPosition());
    expect(result.current.scrollY).toBe(0);
    expect(result.current.isScrolledPastThreshold).toBe(false);
  });

  it("updates scrollY on scroll event", () => {
    const { result } = renderHook(() => useScrollPosition());

    act(() => {
      fireScroll(150);
    });

    expect(result.current.scrollY).toBe(150);
  });

  it("sets isScrolledPastThreshold to true when scrolled past default threshold", () => {
    const { result } = renderHook(() => useScrollPosition());

    act(() => {
      fireScroll(301);
    });

    expect(result.current.isScrolledPastThreshold).toBe(true);
  });

  it("respects custom threshold", () => {
    const { result } = renderHook(() => useScrollPosition(100));

    act(() => {
      fireScroll(50);
    });
    expect(result.current.isScrolledPastThreshold).toBe(false);

    act(() => {
      fireScroll(101);
    });
    expect(result.current.isScrolledPastThreshold).toBe(true);
  });

  it("cleans up scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrollPosition());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
