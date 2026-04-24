import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { FeatureFlagsContext } from "@/providers/feature-flags-provider";
import type { ClientFeatureFlags } from "@/config/feature-flags";
import { useFeatureFlags } from "../useFeatureFlags";

const ALL_FLAGS_DISABLED: ClientFeatureFlags = {
  loyaltyProgram: false,
  referralProgram: false,
  eventsSection: false,
};

const ALL_FLAGS_ENABLED: ClientFeatureFlags = {
  loyaltyProgram: true,
  referralProgram: true,
  eventsSection: true,
};

function createWrapper(flags: ClientFeatureFlags) {
  return ({ children }: { children: ReactNode }) => (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

describe("useFeatureFlags", () => {
  it("throws when used outside FeatureFlagsProvider", () => {
    // renderHook without wrapper — context will be null
    expect(() => {
      renderHook(() => useFeatureFlags());
    }).toThrow("useFeatureFlags must be used within FeatureFlagsProvider");
  });

  it("returns flags from context when all flags are disabled", () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(ALL_FLAGS_DISABLED),
    });

    expect(result.current.loyaltyProgram).toBe(false);
    expect(result.current.referralProgram).toBe(false);
    expect(result.current.eventsSection).toBe(false);
  });

  it("returns flags from context when all flags are enabled", () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(ALL_FLAGS_ENABLED),
    });

    expect(result.current.loyaltyProgram).toBe(true);
    expect(result.current.referralProgram).toBe(true);
    expect(result.current.eventsSection).toBe(true);
  });

  it("returns partial flag state — loyalty enabled, others disabled", () => {
    const partialFlags: ClientFeatureFlags = {
      loyaltyProgram: true,
      referralProgram: false,
      eventsSection: false,
    };

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(partialFlags),
    });

    expect(result.current.loyaltyProgram).toBe(true);
    expect(result.current.referralProgram).toBe(false);
    expect(result.current.eventsSection).toBe(false);
  });

  it("returns partial flag state — eventsSection enabled only", () => {
    const partialFlags: ClientFeatureFlags = {
      loyaltyProgram: false,
      referralProgram: false,
      eventsSection: true,
    };

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(partialFlags),
    });

    expect(result.current.eventsSection).toBe(true);
    expect(result.current.loyaltyProgram).toBe(false);
  });

  it("returns the exact context object reference", () => {
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(ALL_FLAGS_DISABLED),
    });

    expect(result.current).toEqual(ALL_FLAGS_DISABLED);
  });
});
