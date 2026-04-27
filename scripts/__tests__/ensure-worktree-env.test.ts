import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  ensureWorktreeEnv,
  getWorktreeContext,
} = require("../ensure-worktree-env.cjs");

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath: string, contents = ""): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const target = tempDirs.pop();

    if (target) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
});

describe("ensure-worktree-env", () => {
  it("detecta corretamente uma worktree local em .worktrees", () => {
    const repoRoot = makeTempDir("repo-root-");
    tempDirs.push(repoRoot);

    const worktreeRoot = path.join(repoRoot, ".worktrees", "feature-x");
    fs.mkdirSync(worktreeRoot, { recursive: true });

    expect(getWorktreeContext(worktreeRoot)).toEqual({
      isWorktree: true,
      repoRoot,
      worktreeRoot,
    });
  });

  it("cria links simbólicos para envs reais ausentes na worktree", () => {
    const repoRoot = makeTempDir("repo-root-");
    tempDirs.push(repoRoot);

    writeFile(path.join(repoRoot, ".env"), "DATABASE_URL=postgres://example");
    writeFile(
      path.join(repoRoot, ".env.local"),
      "NEXT_PUBLIC_APP_URL=http://x",
    );
    writeFile(path.join(repoRoot, ".env.example"), "DATABASE_URL=");

    const worktreeRoot = path.join(repoRoot, ".worktrees", "feature-x");
    fs.mkdirSync(worktreeRoot, { recursive: true });
    writeFile(path.join(worktreeRoot, ".env.example"), "DATABASE_URL=");

    const result = ensureWorktreeEnv({
      cwd: worktreeRoot,
    });

    expect(result.isWorktree).toBe(true);
    expect(result.linked).toEqual([".env", ".env.local"]);
    expect(fs.lstatSync(path.join(worktreeRoot, ".env")).isSymbolicLink()).toBe(
      true,
    );
    expect(
      fs.lstatSync(path.join(worktreeRoot, ".env.local")).isSymbolicLink(),
    ).toBe(true);
    expect(fs.existsSync(path.join(worktreeRoot, ".env.example"))).toBe(true);
  });

  it("não sobrescreve env local já existente na worktree", () => {
    const repoRoot = makeTempDir("repo-root-");
    tempDirs.push(repoRoot);

    writeFile(path.join(repoRoot, ".env.local"), "ROOT_ENV=1");

    const worktreeRoot = path.join(repoRoot, ".worktrees", "feature-x");
    fs.mkdirSync(worktreeRoot, { recursive: true });
    writeFile(path.join(worktreeRoot, ".env.local"), "WORKTREE_ENV=1");

    const result = ensureWorktreeEnv({
      cwd: worktreeRoot,
    });

    expect(result.linked).toEqual([]);
    expect(result.skipped).toContain(".env.local");
    expect(fs.lstatSync(path.join(worktreeRoot, ".env.local")).isFile()).toBe(
      true,
    );
  });

  it("não faz nada fora de worktree", () => {
    const repoRoot = makeTempDir("repo-root-");
    tempDirs.push(repoRoot);

    writeFile(path.join(repoRoot, ".env.local"), "ROOT_ENV=1");

    const result = ensureWorktreeEnv({
      cwd: repoRoot,
    });

    expect(result).toEqual({
      isWorktree: false,
      repoRoot,
      worktreeRoot: repoRoot,
      linked: [],
      skipped: [],
      missingInRoot: [],
    });
  });
});
