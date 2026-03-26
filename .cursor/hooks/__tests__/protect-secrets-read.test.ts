import { describe, expect, it } from "vitest";

import { evaluateReadFile } from "../protect-secrets-read.js";

describe("evaluateReadFile", () => {
  it("bloqueia leitura de arquivos .env reais", () => {
    expect(
      evaluateReadFile({
        file_path: "/repo/.env.local",
      }),
    ).toMatchObject({
      permission: "deny",
    });
  });

  it("permite arquivos de exemplo", () => {
    expect(
      evaluateReadFile({
        file_path: "/repo/.env.example",
      }),
    ).toEqual({
      permission: "allow",
    });
  });

  it("bloqueia chaves privadas e certificados", () => {
    expect(
      evaluateReadFile({
        file_path: "/repo/certs/production.key",
      }),
    ).toMatchObject({
      permission: "deny",
    });
  });
});
