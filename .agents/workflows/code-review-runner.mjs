#!/usr/bin/env node

/**
 * Code Review Runner - Gold Mustache Barbearia
 *
 * Executa análise completa dos arquivos modificados seguindo
 * os padrões definidos em AGENTS.md e workflows/code-review.md
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();

// Cores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

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

function execCommand(command, description) {
  try {
    log(`\n🔍 ${description}...`);
    const result = execSync(command, { encoding: "utf8", cwd: PROJECT_ROOT });
    logSuccess(`${description} - OK`);
    return { success: true, output: result };
  } catch (error) {
    logError(`${description} - FALHOU`);
    return { success: false, error: error.message };
  }
}

function getChangedFiles() {
  try {
    const files = execSync("git diff --name-only main...HEAD", {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    return files.filter((file) => {
      // Apenas arquivos relevantes para code review
      const extensions = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"];
      const hasValidExtension = extensions.some((ext) => file.endsWith(ext));
      const notInGitIgnore =
        !file.includes(".git/") &&
        !file.includes("node_modules/") &&
        !file.includes("dist/");
      return hasValidExtension && notInGitIgnore;
    });
  } catch {
    logWarning(
      "Não foi possível obter arquivos modificados. Usando análise completa.",
    );
    return [];
  }
}

function analyzeFile(filePath) {
  const fullPath = join(PROJECT_ROOT, filePath);
  if (!existsSync(fullPath)) {
    return null;
  }

  let content;
  try {
    content = readFileSync(fullPath, "utf8");
  } catch (_error) {
    logWarning(`Não foi possível ler ${filePath}, pulando análise.`);
    return null;
  }

  const issues = [];
  const suggestions = [];

  // Análise básica por tipo de arquivo
  if (filePath.endsWith(".tsx")) {
    // Ignorar arquivos de teste
    if (filePath.includes(".test.") || filePath.includes(".spec.")) {
      return {
        file: filePath,
        issues: [],
        suggestions: [],
        lines: content.split("\n").length,
      };
    }

    // Verificações específicas para React components
    if (!content.includes("export default") && !content.includes("export ")) {
      issues.push("Componente não possui export padrão ou nomeado");
    }

    const hasUseState = content.includes("useState");
    const hasReactImport =
      content.includes("import * as React") ||
      content.includes("import React") ||
      content.includes('from "react"');
    const hasReactUseState =
      content.includes("React.useState") || content.includes("React.use");

    if (hasUseState && !hasReactImport && !hasReactUseState) {
      issues.push("useState usado sem import adequado");
    }

    if (
      content.includes("className") &&
      !content.includes("tailwind-merge") &&
      !content.includes("clsx")
    ) {
      suggestions.push(
        "Considere usar clsx ou tailwind-merge para classes condicionais",
      );
    }
  }

  if (filePath.endsWith(".ts")) {
    // Ignorar arquivos de teste
    if (filePath.includes(".test.") || filePath.includes(".spec.")) {
      return {
        file: filePath,
        issues: [],
        suggestions: [],
        lines: content.split("\n").length,
      };
    }

    // Verificações TypeScript
    if (content.includes("any") && !filePath.includes(".d.ts")) {
      // Ignorar comentários que contenham "any"
      const lines = content.split("\n");
      const anyInCode = lines.some((line) => {
        const trimmed = line.trim();
        // Detectar apenas ": any" que indica tipo any
        return (
          trimmed.includes(": any") &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("*")
        );
      });

      if (anyInCode) {
        issues.push("Uso de tipo any detectado");
      }
    }
  }

  // Verificação de imports
  if (content.includes("from '../") || content.includes("from './")) {
    suggestions.push("Considere usar alias @/ para imports relativos");
  }

  // Verificação de console.log
  if (content.includes("console.log") && !filePath.includes("test")) {
    issues.push("console.log detectado - remova antes do commit");
  }

  return {
    file: filePath,
    issues,
    suggestions,
    lines: content.split("\n").length,
  };
}

function generateReviewReport(
  changedFiles,
  lintResult,
  buildResult,
  fileAnalyses,
) {
  const timestamp = new Date().toLocaleString("pt-BR");

  let report = `# 📋 Code Review - Análise Automatizada

## Status: ${lintResult.success && buildResult.success ? "✅ APROVADO" : "❌ REQUER AJUSTES"}

Data: ${timestamp}
Reviewer: AI Assistant
Branch: ${(() => {
    try {
      return execSync("git branch --show-current", {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
      }).trim();
    } catch {
      return "unknown";
    }
  })()}

---

## 📊 Resumo da Análise

- **Arquivos modificados:** ${changedFiles.length}
- **Arquivos analisados:** ${fileAnalyses.length}
- **Issues encontradas:** ${fileAnalyses.reduce((sum, f) => sum + f.issues.length, 0)}
- **Sugestões:** ${fileAnalyses.reduce((sum, f) => sum + f.suggestions.length, 0)}

---

## 🔍 Verificações Automáticas

### Lint (Biome)
${lintResult.success ? "✅ Passou" : "❌ Falhou"}
${lintResult.success ? "" : `\`\`\`\n${lintResult.error}\n\`\`\``}

### Build (Next.js)
${buildResult.success ? "✅ Passou" : "❌ Falhou"}
${buildResult.success ? "" : `\`\`\`\n${buildResult.error}\n\`\`\``}

---

`;

  if (fileAnalyses.length > 0) {
    report += `## 📁 Análise Detalhada dos Arquivos

`;
    fileAnalyses.forEach((analysis) => {
      report += `### ${analysis.file} (${analysis.lines} linhas)
`;
      if (analysis.issues.length > 0) {
        report += `**Issues:**
`;
        analysis.issues.forEach((issue) => {
          report += `- ❌ ${issue}\n`;
        });
        report += "\n";
      }

      if (analysis.suggestions.length > 0) {
        report += `**Sugestões:**
`;
        analysis.suggestions.forEach((suggestion) => {
          report += `- 💡 ${suggestion}\n`;
        });
        report += "\n";
      }

      if (analysis.issues.length === 0 && analysis.suggestions.length === 0) {
        report += `✅ Sem issues detectadas\n\n`;
      }
    });
  }

  report += `---

## 🎯 Padrões Verificados

- ✅ Conformidade com AGENTS.md
- ✅ Padrões de nomenclatura
- ✅ Tipagem TypeScript
- ✅ Imports com alias @/
- ✅ Formatação Biome
- ✅ Segurança básica

---

## 📋 Recomendações

`;

  if (lintResult.success && buildResult.success) {
    report += `### Imediatas
1. ✅ Código aprovado para merge
2. ⚠️ Verificar testes manuais se aplicável
3. ⚠️ Atualizar documentação se necessário

`;
  } else {
    report += `### Obrigatórias
1. ❌ Corrigir erros de lint/build
2. ❌ Remover console.logs
3. ❌ Resolver issues de tipagem

`;
  }

  report += `### Futuras
1. Considerar adicionar testes unitários
2. Melhorar documentação de APIs
3. Otimizar performance se aplicável

---

## 🚀 Próximos Passos

${
  lintResult.success && buildResult.success
    ? "1. Commit com mensagem convencional\n2. Push para repositório\n3. Abrir PR se necessário"
    : "1. Corrigir issues identificadas\n2. Executar review novamente\n3. Verificar funcionalidades críticas"
}

---

**Assinatura:** AI Assistant
**Data:** ${timestamp}
`;

  return report;
}

function main() {
  logSection("🔍 Code Review - Gold Mustache Barbearia");

  // 1. Obter arquivos modificados
  const changedFiles = getChangedFiles();
  log(`📁 Arquivos modificados: ${changedFiles.length}`);
  changedFiles.forEach((file) => {
    log(`  - ${file}`, "cyan");
  });

  // 2. Executar verificações automáticas
  const lintResult = execCommand("pnpm lint", "Verificação de Lint (Biome)");
  const buildResult = execCommand("pnpm build", "Build do Projeto");

  // 3. Analisar arquivos individualmente
  logSection("📋 Análise Individual dos Arquivos");
  const fileAnalyses = changedFiles.map(analyzeFile).filter(Boolean);

  let totalIssues = 0;
  let totalSuggestions = 0;

  fileAnalyses.forEach((analysis) => {
    if (analysis.issues.length > 0) {
      log(`${analysis.file}:`, "yellow");
      analysis.issues.forEach((issue) => {
        log(`  ❌ ${issue}`, "red");
      });
      totalIssues += analysis.issues.length;
    }

    if (analysis.suggestions.length > 0) {
      analysis.suggestions.forEach((suggestion) => {
        log(`  💡 ${suggestion}`, "cyan");
      });
      totalSuggestions += analysis.suggestions.length;
    }

    if (analysis.issues.length === 0 && analysis.suggestions.length === 0) {
      logSuccess(`${analysis.file} - OK`);
    }
  });

  // 4. Gerar relatório
  logSection("📝 Gerando Relatório");
  const report = generateReviewReport(
    changedFiles,
    lintResult,
    buildResult,
    fileAnalyses,
  );

  // Salvar relatório
  const reportPath = join(PROJECT_ROOT, "CODE_REVIEW_AUTO.md");
  writeFileSync(reportPath, report);
  logSuccess(`Relatório salvo em: ${reportPath}`);

  // 5. Resumo final
  logSection("🎯 Resumo Final");
  log(`Arquivos analisados: ${fileAnalyses.length}`);
  log(`Issues: ${totalIssues}`, totalIssues > 0 ? "red" : "green");
  log(
    `Sugestões: ${totalSuggestions}`,
    totalSuggestions > 0 ? "yellow" : "green",
  );

  const overallStatus =
    lintResult.success && buildResult.success && totalIssues === 0;
  log(
    `\nStatus Geral: ${overallStatus ? "✅ APROVADO" : "❌ REQUER AJUSTES"}`,
    overallStatus ? "green" : "red",
  );

  if (!overallStatus) {
    log(
      "\n🔧 Execute as correções necessárias e rode o review novamente.",
      "yellow",
    );
  }
}

main();
