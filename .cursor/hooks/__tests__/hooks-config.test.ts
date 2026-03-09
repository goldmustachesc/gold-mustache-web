import path from "node:path";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const hooksConfigPath = path.resolve(import.meta.dirname, "../../hooks.json");

function getBeforeShellMatcher() {
  const hooksConfig = JSON.parse(readFileSync(hooksConfigPath, "utf8"));

  return hooksConfig.hooks.beforeShellExecution[0].matcher;
}

describe("hooks.json", () => {
  it("aciona o hook de shell para remocao com flags separadas", () => {
    const matcher = new RegExp(getBeforeShellMatcher());

    expect(matcher.test("rm -r -f src")).toBe(true);
    expect(matcher.test("rm -f -r src")).toBe(true);
  });
});
