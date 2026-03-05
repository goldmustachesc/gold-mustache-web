import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConsent } from "../useConsent";

const mockApiAction = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true }),
);

vi.mock("@/lib/api/client", () => ({
  apiAction: mockApiAction,
}));

let storage: Record<string, string>;

beforeEach(() => {
  storage = {};
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(
    (key: string) => storage[key] ?? null,
  );
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(
    (key: string, value: string) => {
      storage[key] = value;
    },
  );
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
    (key: string) => {
      delete storage[key];
    },
  );

  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    "test-uuid-1234" as ReturnType<typeof crypto.randomUUID>,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useConsent", () => {
  it("resolves isLoading to false after mount", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("loads preferences from localStorage on mount", async () => {
    storage["cookie-consent"] = JSON.stringify({
      analytics: true,
      marketing: false,
    });

    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences.analytics).toBe(true);
    expect(result.current.preferences.marketing).toBe(false);
    expect(result.current.hasDecided).toBe(true);
  });

  it("defaults to all-false when no stored consent", async () => {
    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences.analytics).toBe(false);
    expect(result.current.preferences.marketing).toBe(false);
    expect(result.current.hasDecided).toBe(false);
  });

  it("hasConsent returns false when no decision made", async () => {
    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasConsent("analytics")).toBe(false);
  });

  it("hasConsent returns true for accepted type", async () => {
    storage["cookie-consent"] = JSON.stringify({
      analytics: true,
      marketing: false,
    });

    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasConsent("analytics")).toBe(true);
    expect(result.current.hasConsent("marketing")).toBe(false);
  });

  it("acceptAll sets both analytics and marketing to true", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(result.current.preferences.analytics).toBe(true);
    expect(result.current.preferences.marketing).toBe(true);
    expect(result.current.hasDecided).toBe(true);
  });

  it("acceptAll persists to localStorage", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(storage["cookie-consent"]).toBe(
      JSON.stringify({ analytics: true, marketing: true }),
    );
  });

  it("acceptAll syncs with server via apiAction", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(mockApiAction).toHaveBeenCalledWith(
      "/api/consent",
      "POST",
      expect.objectContaining({
        analyticsConsent: true,
        marketingConsent: true,
      }),
    );
  });

  it("rejectNonEssential sets both to false", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rejectNonEssential();
    });

    expect(result.current.preferences.analytics).toBe(false);
    expect(result.current.preferences.marketing).toBe(false);
    expect(result.current.hasDecided).toBe(true);
  });

  it("updatePreferences applies custom preferences", async () => {
    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({
        analytics: true,
        marketing: false,
      });
    });

    expect(result.current.preferences.analytics).toBe(true);
    expect(result.current.preferences.marketing).toBe(false);
  });

  it("openPreferences dispatches custom event", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const { result } = renderHook(() => useConsent());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.openPreferences();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "open-cookie-preferences" }),
    );
  });

  it("handles invalid JSON in localStorage gracefully", async () => {
    storage["cookie-consent"] = "not-valid-json{";

    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasDecided).toBe(false);
    expect(result.current.preferences.analytics).toBe(false);
  });

  it("generates anonymous ID on first visit", async () => {
    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.anonymousId).toBe("test-uuid-1234");
    expect(storage["cookie-anonymous-id"]).toBe("test-uuid-1234");
  });

  it("reuses existing anonymous ID", async () => {
    storage["cookie-anonymous-id"] = "existing-id";

    const { result } = renderHook(() => useConsent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.anonymousId).toBe("existing-id");
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });
});
