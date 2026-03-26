import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const blockedExtensions = new Set([".pem", ".key", ".p12", ".crt"]);
const allowedEnvFiles = new Set([
  ".env.example",
  ".env.sample",
  ".env.template",
]);

export function isSensitiveFile(filePath) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return false;
  }

  const baseName = path.basename(filePath).toLowerCase();

  if (blockedExtensions.has(path.extname(baseName))) {
    return true;
  }

  return baseName.startsWith(".env") && !allowedEnvFiles.has(baseName);
}

export function evaluateReadFile(input) {
  const filePath = typeof input?.file_path === "string" ? input.file_path : "";

  if (!isSensitiveFile(filePath)) {
    return {
      permission: "allow",
    };
  }

  return {
    permission: "deny",
    user_message:
      "A leitura automatica desse arquivo sensivel foi bloqueada. Use .env.example como referencia ou compartilhe uma versao sanitizada.",
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
  const response = evaluateReadFile(input);
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
