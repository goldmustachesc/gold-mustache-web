import { describe, expect, it } from "vitest";
import {
  mobileBottomFabOffset,
  mobileBottomNavOffset,
  mobileBottomNavOffsetVar,
  mobileFabOffsetClassName,
  mobileOffsetClassName,
  mobileStickyOffsetClassName,
} from "../mobile-nav-layout";

describe("mobile-nav-layout", () => {
  it("derives all mobile offsets from the same shared CSS variable", () => {
    expect(mobileBottomNavOffsetVar).toBe("--private-mobile-bottom-nav-offset");
    expect(mobileBottomNavOffset).toBe(
      "var(--private-mobile-bottom-nav-offset)",
    );
    expect(mobileBottomFabOffset).toBe(
      "calc(var(--private-mobile-bottom-nav-offset) + 1rem)",
    );
  });

  it("exposes shared class tokens for content, sticky actions, and fab", () => {
    expect(mobileOffsetClassName).toBe(
      "pb-[var(--private-mobile-bottom-nav-offset)] lg:pb-0",
    );
    expect(mobileStickyOffsetClassName).toBe(
      "bottom-[var(--private-mobile-bottom-nav-offset)]",
    );
    expect(mobileFabOffsetClassName).toBe(
      "bottom-[calc(var(--private-mobile-bottom-nav-offset)+1rem)]",
    );
  });
});
