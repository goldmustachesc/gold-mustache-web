import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("lib/utils", () => {
  it("cn joins classes", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("cn merges tailwind conflicts via tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("px-2", "px-4", "py-1")).toBe("px-4 py-1");
  });
});
