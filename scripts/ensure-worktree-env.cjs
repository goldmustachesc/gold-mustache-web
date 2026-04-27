#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function getWorktreeContext(cwd = process.cwd()) {
  const normalizedCwd = path.resolve(cwd);
  const segments = normalizedCwd.split(path.sep);
  const worktreeIndex = segments.findIndex(
    (segment) => segment === ".worktrees" || segment === "worktrees",
  );

  if (worktreeIndex === -1 || worktreeIndex === segments.length - 1) {
    return {
      isWorktree: false,
      repoRoot: normalizedCwd,
      worktreeRoot: normalizedCwd,
    };
  }

  const repoRootSegments = segments.slice(0, worktreeIndex);
  const worktreeRootSegments = segments.slice(0, worktreeIndex + 2);
  const repoRoot = repoRootSegments.join(path.sep) || path.sep;
  const worktreeRoot = worktreeRootSegments.join(path.sep) || path.sep;

  return {
    isWorktree: true,
    repoRoot,
    worktreeRoot,
  };
}

function shouldLinkEnvFile(fileName) {
  return (
    fileName.startsWith(".env") &&
    fileName !== ".env.example" &&
    !fileName.endsWith(".example")
  );
}

function ensureWorktreeEnv(options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const log = options.log ?? (() => {});
  const context = getWorktreeContext(cwd);

  const result = {
    ...context,
    linked: [],
    skipped: [],
    missingInRoot: [],
  };

  if (!context.isWorktree) {
    return result;
  }

  const rootEntries = fs.readdirSync(context.repoRoot);
  const rootEnvFiles = rootEntries.filter(shouldLinkEnvFile).sort();

  for (const fileName of rootEnvFiles) {
    const sourcePath = path.join(context.repoRoot, fileName);
    const targetPath = path.join(context.worktreeRoot, fileName);

    if (!fs.existsSync(sourcePath)) {
      result.missingInRoot.push(fileName);
      continue;
    }

    if (fs.existsSync(targetPath)) {
      result.skipped.push(fileName);
      continue;
    }

    const relativeSource = path.relative(path.dirname(targetPath), sourcePath);

    fs.symlinkSync(relativeSource, targetPath);
    result.linked.push(fileName);
    log(`[worktree-env] linked ${fileName}`);
  }

  if (rootEnvFiles.length === 0) {
    log("[worktree-env] no root env files found to link");
  }

  return result;
}

function main() {
  const result = ensureWorktreeEnv({
    log: (message) => console.log(message),
  });

  if (!result.isWorktree) {
    return;
  }

  if (result.linked.length === 0 && result.missingInRoot.length === 0) {
    console.log("[worktree-env] env already ready");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ensureWorktreeEnv,
  getWorktreeContext,
  shouldLinkEnvFile,
};
