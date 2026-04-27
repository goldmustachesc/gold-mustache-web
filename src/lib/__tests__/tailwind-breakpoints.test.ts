import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tailwind theme breakpoints", () => {
  it("defines named breakpoints for xs and ipad ranges", () => {
    const globalsCss = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    expect(globalsCss).toContain("--breakpoint-xs: 25rem;");
    expect(globalsCss).toContain("--breakpoint-ipad: 52.125rem;");
  });
});
