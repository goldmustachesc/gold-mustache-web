import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const COVERAGE_SCOPE = process.env.COVERAGE_SCOPE ?? "core";
const ENFORCE_COVERAGE = process.env.COVERAGE_ENFORCE === "true";

const coverageInclude = (() => {
  if (COVERAGE_SCOPE === "all") return ["src/**/*.{ts,tsx}"];
  if (COVERAGE_SCOPE === "services") return ["src/services/**/*.{ts,tsx}"];
  if (COVERAGE_SCOPE === "integrations")
    return ["src/services/auth.ts", "src/services/instagram.ts"];

  // "core" scope: lógica pura (unit-testável) — services ficam em um gate separado
  return [
    "src/utils/**/*.{ts,tsx}",
    "src/lib/booking/**/*.{ts,tsx}",
    "src/lib/utils.ts",
  ];
})();

const coverageExclude = (() => {
  const base = [
    "**/node_modules/**",
    "**/.next/**",
    "**/prisma/**",
    "**/public/**",
    "**/docs/**",
    "**/__tests__/**",
    "**/*.test.*",
    "**/*.d.ts",
    "**/*.config.*",
    "**/vitest.setup.*",
    // Next App Router entrypoints & route handlers are better covered by e2e/integration
    "src/app/**",
    // i18n message catalogs are data, not logic
    "src/i18n/**",
    // External integration clients & auth helpers (covered later with integration)
    "src/lib/supabase/**",
    "src/lib/auth/**",
    "src/lib/prisma.ts",
    "src/lib/validations/**",
  ];

  if (COVERAGE_SCOPE === "core") {
    base.push("src/services/**");
  }

  if (COVERAGE_SCOPE === "services") {
    // Defer external integrations for a later stage (integration/e2e or contract tests)
    base.push("src/services/auth.ts", "src/services/instagram.ts");
  }

  return base;
})();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: coverageInclude,
      exclude: coverageExclude,
      ...(ENFORCE_COVERAGE
        ? {
            thresholds: {
              lines: 90,
              functions: 90,
              statements: 90,
              // Branch coverage is intentionally a bit lower: several branches here are
              // defensive fallbacks around Intl parts parsing that are hard/impossible
              // to trigger deterministically without global mocking.
              branches: 80,
            },
          }
        : {}),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
