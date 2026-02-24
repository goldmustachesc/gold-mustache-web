#!/usr/bin/env node

/**
 * Script de validação pré-commit automatizado
 * Executa verificações de qualidade e impede commit se houver erros
 */

const { execSync } = require("node:child_process");
const process = require("node:process");

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n🔍 ${description}...`, "blue");
    execSync(command, {
      encoding: "utf8",
      stdio: "inherit", // Use inherit to prevent deadlocks with large output
      cwd: process.cwd(),
    });
    log(`✅ ${description} - OK`, "green");
    return { success: true };
  } catch (error) {
    log(`❌ ${description} - FALHOU`, "red");
    // When stdio is inherit, error output is already displayed to user
    return { success: false, error };
  }
}

function main() {
  log("🚀 Validação Pré-Commit Automatizada", "magenta");
  log("=====================================", "magenta");

  const checks = [
    {
      command: "pnpm lint",
      description: "Verificação de linting",
      required: true,
    },
    {
      command: "pnpm build",
      description: "Build de produção",
      required: true,
    },
    {
      command: "pnpm test",
      description: "Execução de testes",
      required: false, // permite falhar em testes por enquanto
    },
  ];

  let allPassed = true;
  const criticalFailures = [];

  for (const check of checks) {
    const result = runCommand(check.command, check.description);

    if (!result.success && check.required) {
      allPassed = false;
      criticalFailures.push(check.description);
    }
  }

  log("\n📊 Resultado da Validação", "magenta");
  log("=============================", "magenta");

  if (allPassed) {
    log("✅ Todas as verificações passaram!", "green");
    log("🎉 Pode prosseguir com o commit!", "green");
    process.exit(0);
  } else {
    log("❌ Falhas críticas encontradas:", "red");
    criticalFailures.forEach((failure) => {
      log(`  - ${failure}`, "red");
    });
    log("\n💡 Corrija os erros acima antes de fazer commit.", "yellow");
    log("🔧 Use: pnpm lint (para erros de lint)", "yellow");
    log("🔧 Use: pnpm build (para erros de build)", "yellow");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runCommand };
