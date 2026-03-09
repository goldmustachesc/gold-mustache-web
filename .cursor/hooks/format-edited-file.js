import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const formattableExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".cjs",
  ".mjs",
  ".json",
  ".css",
]);

const ignoredSegments = new Set([
  "node_modules",
  ".next",
  "coverage",
  "dist",
  "build",
]);

export function shouldFormatFile(
  filePath,
  projectDir = process.env.CURSOR_PROJECT_DIR ?? process.cwd(),
) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return false;
  }

  const resolvedProjectDir = path.resolve(projectDir);
  const resolvedFilePath = path.resolve(filePath);
  const relativePath = path.relative(resolvedProjectDir, resolvedFilePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return false;
  }

  if (
    !formattableExtensions.has(path.extname(resolvedFilePath).toLowerCase())
  ) {
    return false;
  }

  return !relativePath
    .split(path.sep)
    .some((segment) => ignoredSegments.has(segment));
}

export function handleAfterFileEdit(input, options = {}) {
  const filePath = typeof input?.file_path === "string" ? input.file_path : "";
  const projectDir =
    options.projectDir ?? process.env.CURSOR_PROJECT_DIR ?? process.cwd();
  const run = options.run ?? spawnSync;

  if (!shouldFormatFile(filePath, projectDir)) {
    return {
      attempted: false,
      success: true,
    };
  }

  const result = run("pnpm", ["exec", "biome", "format", "--write", filePath], {
    cwd: projectDir,
    encoding: "utf8",
  });

  const success =
    typeof result.status === "number"
      ? result.status === 0
      : result.error === undefined;

  return {
    attempted: true,
    success,
  };
}

async function readJsonInput() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function main() {
  const input = await readJsonInput();
  handleAfterFileEdit(input);
  process.stdout.write("{}\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
