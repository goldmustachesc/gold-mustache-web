import { describe, expect, it, vi } from "vitest";

import {
  handleAfterFileEdit,
  shouldFormatFile,
} from "../format-edited-file.js";

describe("shouldFormatFile", () => {
  const projectDir = "/repo";

  it("aceita arquivos suportados dentro do projeto", () => {
    expect(shouldFormatFile("/repo/src/app/page.tsx", projectDir)).toBe(true);
  });

  it("ignora arquivos sensiveis e formatos nao suportados", () => {
    expect(shouldFormatFile("/repo/.env.local", projectDir)).toBe(false);
    expect(shouldFormatFile("/repo/docs/readme.md", projectDir)).toBe(false);
  });

  it("ignora arquivos fora do workspace", () => {
    expect(shouldFormatFile("/other/app/page.tsx", projectDir)).toBe(false);
  });
});

describe("handleAfterFileEdit", () => {
  it("executa o Biome em arquivos formataveis", () => {
    const run = vi.fn().mockReturnValue({ status: 0 });

    const result = handleAfterFileEdit(
      { file_path: "/repo/src/components/Layout.tsx" },
      {
        projectDir: "/repo",
        run,
      },
    );

    expect(run).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "biome", "format", "--write", "/repo/src/components/Layout.tsx"],
      expect.objectContaining({
        cwd: "/repo",
        encoding: "utf8",
      }),
    );
    expect(result).toEqual({
      attempted: true,
      success: true,
    });
  });

  it("nao executa nada para arquivos nao suportados", () => {
    const run = vi.fn();

    const result = handleAfterFileEdit(
      { file_path: "/repo/.env.local" },
      {
        projectDir: "/repo",
        run,
      },
    );

    expect(run).not.toHaveBeenCalled();
    expect(result).toEqual({
      attempted: false,
      success: true,
    });
  });
});
