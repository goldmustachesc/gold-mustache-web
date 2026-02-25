#!/usr/bin/env node

/**
 * Pre-Commit Quality Check - Gold Mustache Barbearia
 *
 * Análise completa de qualidade de código antes de commits
 * Garante apenas código de alta qualidade no repositório
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const PROJECT_ROOT = process.cwd();
const REPORT_PATH = join(PROJECT_ROOT, "PRE_COMMIT_QUALITY_REPORT.md");

// Cores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// Configurações
const CONFIG = {
  minCoverage: 80,
  maxComplexity: 10,
  maxDuplication: 15,
  maxBundleIncrease: 5,
  minPerformanceScore: 90,
  minSecurityScore: 90,
};

// Argumentos CLI
const args = process.argv.slice(2);
const isStrict = args.includes("--strict");
const isQuick = args.includes("--quick");

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "cyan");
}

function execCommand(command, description, options = {}) {
  try {
    log(`🔍 ${description}...`);
    const result = execSync(command, {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
      ...options,
    });
    logSuccess(`${description} - OK`);
    return { success: true, output: result };
  } catch (error) {
    logError(`${description} - FALHOU`);
    return { success: false, error: error.message };
  }
}

function getChangedFiles() {
  try {
    // Get both staged and unstaged changes
    const staged = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const unstaged = execSync("git diff --name-only", {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const allFiles = [...new Set([...staged, ...unstaged])];

    return allFiles.filter((file) => {
      const ext = extname(file);
      const validExts = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"];
      return validExts.includes(ext) && !file.includes("node_modules");
    });
  } catch (_error) {
    logWarning(
      "Não foi possível obter arquivos modificados. Analisando projeto completo.",
    );
    return [];
  }
}

function analyzeFileComplexity(filePath) {
  try {
    const content = readFileSync(join(PROJECT_ROOT, filePath), "utf8");
    const lines = content.split("\n");

    // Simple complexity analysis
    let complexity = 1; // Base complexity
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /case\s+.*:/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g,
    ];

    complexityPatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    });

    return {
      lines: lines.length,
      complexity,
      isTooComplex: complexity > CONFIG.maxComplexity,
    };
  } catch (_error) {
    return { lines: 0, complexity: 0, isTooComplex: false };
  }
}

function checkDependencies() {
  logSection("📦 Análise de Dependências");

  const packageJsonPath = join(PROJECT_ROOT, "package.json");
  if (!existsSync(packageJsonPath)) {
    logWarning("package.json não encontrado");
    return { score: 0, issues: ["package.json não encontrado"] };
  }

  const _packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  // Check for known vulnerable packages
  const auditResult = execCommand(
    "pnpm audit --json",
    "Verificação de vulnerabilidades",
  );

  let score = 100;
  const issues = [];

  if (!auditResult.success) {
    score -= 30;
    issues.push("Vulnerabilidades de segurança encontradas");
  }

  // Check for outdated packages
  try {
    const outdated = execSync("pnpm outdated --json", {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    });
    if (outdated.trim()) {
      score -= 10;
      issues.push("Dependências desatualizadas encontradas");
    }
  } catch {
    // No outdated packages or command failed
  }

  return { score, issues };
}

function checkCodeQuality() {
  logSection("📊 Análise de Qualidade de Código");

  const files = getChangedFiles();
  if (files.length === 0) {
    logInfo("Nenhum arquivo modificado para analisar");
    return { score: 100, issues: [], suggestions: [] };
  }

  let totalComplexity = 0;
  const _totalLines = 0;
  const complexFiles = [];
  const suggestions = [];

  files.forEach((file) => {
    const analysis = analyzeFileComplexity(file);
    totalComplexity += analysis.complexity;

    if (analysis.isTooComplex) {
      complexFiles.push(`${file} (complexidade: ${analysis.complexity})`);
    }

    // Check for potential improvements
    if (file.endsWith(".tsx") && analysis.lines > 200) {
      suggestions.push(`${file}: Considere dividir em componentes menores`);
    }
  });

  const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
  let score = 100;
  const issues = [];

  if (complexFiles.length > 0) {
    score -= 20;
    issues.push(
      `Arquivos com complexidade excessiva: ${complexFiles.join(", ")}`,
    );
  }

  if (avgComplexity > CONFIG.maxComplexity) {
    score -= 15;
    issues.push(`Complexidade média alta: ${avgComplexity.toFixed(1)}`);
  }

  return { score, issues, suggestions };
}

function checkTests() {
  logSection("🧪 Verificação de Testes");

  if (isQuick) {
    logInfo("Modo quick: pulando verificação de coverage");
    return { score: 100, coverage: 0, issues: [] };
  }

  const testResult = execCommand("vitest --run", "Execução de testes");
  if (!testResult.success) {
    return { score: 0, coverage: 0, issues: ["Testes falhando"] };
  }

  const coverageResult = execCommand(
    "vitest --run --coverage",
    "Verificação de coverage",
  );
  let coverage = 0;
  const issues = [];

  if (coverageResult.success) {
    // Extract coverage from output (simplified)
    const coverageMatch = coverageResult.output.match(
      /All files\s+\|\s+([\d.]+)/,
    );
    if (coverageMatch) {
      coverage = parseFloat(coverageMatch[1]);
    }
  }

  let score = 100;
  if (coverage < CONFIG.minCoverage) {
    score -= 25;
    issues.push(
      `Coverage abaixo do mínimo: ${coverage}% (mínimo: ${CONFIG.minCoverage}%)`,
    );
  }

  return { score, coverage, issues };
}

function checkPerformance() {
  logSection("⚡ Análise de Performance");

  if (isQuick) {
    logInfo("Modo quick: pulando análise de performance");
    return { score: 100, issues: [] };
  }

  const buildResult = execCommand(
    "pnpm build",
    "Build para análise de performance",
  );
  if (!buildResult.success) {
    return { score: 0, issues: ["Build falhou"] };
  }

  // Check bundle size (simplified)
  const buildDir = join(PROJECT_ROOT, ".next");
  let totalSize = 0;

  try {
    if (existsSync(buildDir)) {
      const files = execSync(
        `find ${buildDir} -name "*.js" -exec ls -la {} \\;`,
        { encoding: "utf8", cwd: PROJECT_ROOT },
      );
      const lines = files.trim().split("\n");
      lines.forEach((line) => {
        const match = line.match(/\s+(\d+)\s+\w+\s+.+\.js$/);
        if (match) {
          totalSize += parseInt(match[1], 10);
        }
      });
    }
  } catch {
    logWarning("Não foi possível calcular tamanho do bundle");
  }

  const bundleSizeMB = totalSize / (1024 * 1024);
  let score = 100;
  const issues = [];

  if (bundleSizeMB > 5) {
    score -= 20;
    issues.push(`Bundle grande: ${bundleSizeMB.toFixed(2)}MB`);
  }

  return { score, bundleSize: bundleSizeMB, issues };
}

function checkSecurity() {
  logSection("🔒 Análise de Segurança");

  let score = 100;
  const issues = [];

  // Check for secrets in code
  const files = getChangedFiles();
  files.forEach((file) => {
    try {
      const content = readFileSync(join(PROJECT_ROOT, file), "utf8");

      // Check for potential secrets
      const secretPatterns = [
        /password\s*=\s*["'][^"']+["']/i,
        /api[_-]?key\s*=\s*["'][^"']+["']/i,
        /secret\s*=\s*["'][^"']+["']/i,
        /token\s*=\s*["'][^"']+["']/i,
      ];

      secretPatterns.forEach((pattern) => {
        if (pattern.test(content)) {
          score -= 50;
          issues.push(`Possível secret em ${file}`);
        }
      });
    } catch {
      // Ignore files that can't be read
    }
  });

  // Check for insecure dependencies
  const auditResult = execCommand(
    "pnpm audit --audit-level high",
    "Verificação de segurança",
  );
  if (!auditResult.success) {
    score -= 30;
    issues.push("Vulnerabilidades de alta severidade encontradas");
  }

  return { score, issues };
}

function hasCriticalCategoryFailure(results) {
  const MIN_CATEGORY_SCORE = 70;
  return [
    results.dependencies.score,
    results.codeQuality.score,
    results.tests.score,
    results.performance.score,
    results.security.score,
  ].some((score) => score < MIN_CATEGORY_SCORE);
}

function generateQualityReport(results) {
  const timestamp = new Date().toLocaleString("pt-BR");
  const overallScore = Math.round(
    results.dependencies.score * 0.15 +
      results.codeQuality.score * 0.25 +
      results.tests.score * 0.25 +
      results.performance.score * 0.2 +
      results.security.score * 0.15,
  );

  const hasCriticalFailure = hasCriticalCategoryFailure(results);

  let status = "✅ PASS";
  if (
    overallScore < 70 ||
    hasCriticalFailure ||
    (isStrict && overallScore < 90)
  ) {
    status = "❌ FAIL";
  } else if (overallScore < 85) {
    status = "⚠️ WARN";
  }

  const report = `# 🔍 Pre-Commit Quality Report

## Status: ${status}

**Data:** ${timestamp}
**Score Geral:** ${overallScore}/100
**Modo:** ${isStrict ? "Strict" : isQuick ? "Quick" : "Normal"}

---

## 📊 Resumo por Categoria

| Categoria | Score | Status |
|-----------|-------|--------|
| 📦 Dependências | ${results.dependencies.score}/100 | ${results.dependencies.score >= 80 ? "✅" : "❌"} |
| 📊 Qualidade | ${results.codeQuality.score}/100 | ${results.codeQuality.score >= 80 ? "✅" : "❌"} |
| 🧪 Testes | ${results.tests.score}/100 | ${results.tests.score >= 80 ? "✅" : "❌"} |
| ⚡ Performance | ${results.performance.score}/100 | ${results.performance.score >= 80 ? "✅" : "❌"} |
| 🔒 Segurança | ${results.security.score}/100 | ${results.security.score >= 80 ? "✅" : "❌"} |

---

## 📦 Dependências

${
  results.dependencies.issues.length > 0
    ? `### Issues Encontradas:\n${results.dependencies.issues.map((issue) => `- ❌ ${issue}`).join("\n")}\n`
    : "✅ Nenhuma issue de dependências encontrada\n"
}

---

## 📊 Qualidade de Código

${
  results.codeQuality.issues.length > 0
    ? `### Issues Críticas:\n${results.codeQuality.issues.map((issue) => `- ❌ ${issue}`).join("\n")}\n`
    : "✅ Código dentro dos padrões de qualidade\n"
}

${
  results.codeQuality.suggestions.length > 0
    ? `### Sugestões de Melhoria:\n${results.codeQuality.suggestions.map((suggestion) => `- 💡 ${suggestion}`).join("\n")}\n`
    : ""
}

---

## 🧪 Testes

**Coverage:** ${results.tests.coverage}%
**Mínimo Requerido:** ${CONFIG.minCoverage}%

${
  results.tests.issues.length > 0
    ? `\n### Issues:\n${results.tests.issues.map((issue) => `- ❌ ${issue}`).join("\n")}\n`
    : "\n✅ Todos os testes passando\n"
}

---

## ⚡ Performance

**Bundle Size:** ${results.performance.bundleSize ? `${results.performance.bundleSize.toFixed(2)}MB` : "N/A"}

${
  results.performance.issues.length > 0
    ? `\n### Issues:\n${results.performance.issues.map((issue) => `- ❌ ${issue}`).join("\n")}\n`
    : "\n✅ Performance dentro dos limites aceitáveis\n"
}

---

## 🔒 Segurança

${
  results.security.issues.length > 0
    ? `### Issues Críticas:\n${results.security.issues.map((issue) => `- 🔴 ${issue}`).join("\n")}\n`
    : "✅ Nenhuma vulnerabilidade de segurança encontrada\n"
}

---

## 🎯 Recomendações

${
  overallScore >= 90
    ? "🎉 Excelente! Código pronto para commit."
    : overallScore >= 80
      ? "👍 Bom trabalho! Considere as sugestões de melhoria."
      : overallScore >= 70
        ? "⚠️ Código aceitável, mas pode ser melhorado."
        : "❌ Corrija as issues críticas antes de commitar."
}

---

## 🚀 Próximos Passos

${
  status === "❌ FAIL"
    ? `1. Corrija as issues críticas identificadas\n2. Execute o check novamente\n3. Verifique se o score melhorou`
    : status === "⚠️ WARN"
      ? `1. Considere implementar as sugestões\n2. Melhore o coverage de testes\n3. Otimize a performance se possível`
      : `1. Código pronto para commit ✅\n2. Continue com o workflow normal\n3. Mantenha a qualidade!`
}

---

**Relatório gerado automaticamente pelo Pre-Commit Quality Check**
**Gold Mustache Barbearia - ${timestamp}**
`;

  return report;
}

function main() {
  logSection("🔍 Pre-Commit Quality Check - Gold Mustache Barbearia");
  log(`Modo: ${isStrict ? "Strict" : isQuick ? "Quick" : "Normal"}`);

  const startTime = Date.now();

  // Executar todas as verificações
  const results = {
    dependencies: checkDependencies(),
    codeQuality: checkCodeQuality(),
    tests: checkTests(),
    performance: checkPerformance(),
    security: checkSecurity(),
  };

  // Gerar relatório
  logSection("📝 Gerando Relatório");
  const report = generateQualityReport(results);
  writeFileSync(REPORT_PATH, report);
  logSuccess(`Relatório salvo em: ${REPORT_PATH}`);

  // Calcular score geral
  const overallScore = Math.round(
    results.dependencies.score * 0.15 +
      results.codeQuality.score * 0.25 +
      results.tests.score * 0.25 +
      results.performance.score * 0.2 +
      results.security.score * 0.15,
  );

  // Resultado final
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  logSection("🎯 Resultado Final");
  log(
    `Score Geral: ${overallScore}/100`,
    overallScore >= 80 ? "green" : overallScore >= 70 ? "yellow" : "red",
  );
  log(`Duração: ${duration}s`);

  const hasCriticalFailure = hasCriticalCategoryFailure(results);

  let status = "✅ PASS";
  if (
    overallScore < 70 ||
    hasCriticalFailure ||
    (isStrict && overallScore < 90)
  ) {
    status = "❌ FAIL";
  } else if (overallScore < 85) {
    status = "⚠️ WARN";
  }

  if (hasCriticalFailure) {
    logWarning("Categoria com score abaixo de 70 detectada");
  }

  log(
    `Status: ${status}`,
    status.includes("PASS")
      ? "green"
      : status.includes("WARN")
        ? "yellow"
        : "red",
  );

  // Exit code baseado no resultado
  if (status === "❌ FAIL") {
    log("\n🔧 Corrija as issues identificadas antes de commitar.", "red");
    process.exit(1);
  } else if (status === "⚠️ WARN" && isStrict) {
    log("\n⚠️ Modo strict: corrija os avisos antes de commitar.", "yellow");
    process.exit(1);
  } else {
    log("\n✅ Código aprovado para commit!", "green");
    process.exit(0);
  }
}

main();
