import process from "node:process";
import { pathToFileURL } from "node:url";

const riskyCommandRules = [
  {
    label: "git reset --hard",
    regex: /\bgit\s+reset\s+--hard\b/i,
  },
  {
    label: "git checkout --",
    regex: /\bgit\s+checkout\s+--\b/i,
  },
  {
    label: "git restore --source",
    regex: /\bgit\s+restore\b[\s\S]*--source\b/i,
  },
  {
    label: "git clean -f",
    regex: /\bgit\s+clean\s+-[^\n]*f/i,
  },
  {
    label: "git push --force",
    regex: /\bgit\s+push\b[\s\S]*--force(?:-with-lease)?\b/i,
  },
];

const shortRecursiveFlagPattern = /(^|\s)-[A-Za-z]*[rR][A-Za-z]*(?=\s|$)/;
const longRecursiveFlagPattern = /(^|\s)--recursive(?=\s|$)/i;
const shortForceFlagPattern = /(^|\s)-[A-Za-z]*f[A-Za-z]*(?=\s|$)/;
const longForceFlagPattern = /(^|\s)--force(?=\s|$)/i;

function isDestructiveRemoveCommand(command) {
  if (!/\brm\b/i.test(command)) {
    return false;
  }

  const hasRecursiveFlag =
    shortRecursiveFlagPattern.test(command) ||
    longRecursiveFlagPattern.test(command);
  const hasForceFlag =
    shortForceFlagPattern.test(command) || longForceFlagPattern.test(command);

  return hasRecursiveFlag && hasForceFlag;
}

export function evaluateShellCommand(input) {
  const command =
    typeof input?.command === "string" ? input.command.trim() : "";

  if (!command) {
    return {
      permission: "allow",
    };
  }

  const matchedRule = riskyCommandRules.find(({ regex }) =>
    regex.test(command),
  );

  if (matchedRule) {
    return {
      permission: "ask",
      user_message: `O comando "${command}" parece destrutivo (${matchedRule.label}). Revise antes de aprovar.`,
      agent_message: `O comando "${command}" foi marcado como potencialmente destrutivo (${matchedRule.label}). So prossiga com confirmacao explicita do usuario e apenas quando nao houver alternativa reversivel.`,
    };
  }

  if (!isDestructiveRemoveCommand(command)) {
    return {
      permission: "allow",
    };
  }

  return {
    permission: "ask",
    user_message: `O comando "${command}" parece destrutivo (rm com flags recursivas e forcadas). Revise antes de aprovar.`,
    agent_message: `O comando "${command}" foi marcado como potencialmente destrutivo (rm com flags recursivas e forcadas). So prossiga com confirmacao explicita do usuario e apenas quando nao houver alternativa reversivel.`,
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
  const response = evaluateShellCommand(input);
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
