import { describe, expect, it } from "vitest";

import { evaluateShellCommand } from "../guard-destructive-shell.js";

describe("evaluateShellCommand", () => {
  it("pede confirmacao para comandos git destrutivos", () => {
    expect(
      evaluateShellCommand({
        command: "git reset --hard HEAD",
      }),
    ).toMatchObject({
      permission: "ask",
    });
  });

  it("pede confirmacao para remocao recursiva forcada", () => {
    expect(
      evaluateShellCommand({
        command: "rm -rf src",
      }),
    ).toMatchObject({
      permission: "ask",
    });
  });

  it("pede confirmacao para remocao com flags separadas", () => {
    expect(
      evaluateShellCommand({
        command: "rm -r -f src",
      }),
    ).toMatchObject({
      permission: "ask",
    });
  });

  it("libera comandos seguros", () => {
    expect(
      evaluateShellCommand({
        command: "pnpm test",
      }),
    ).toEqual({
      permission: "allow",
    });
  });

  it("nao bloqueia remocao simples sem flag recursiva", () => {
    expect(
      evaluateShellCommand({
        command: "rm -f arquivo.tmp",
      }),
    ).toEqual({
      permission: "allow",
    });
  });
});
