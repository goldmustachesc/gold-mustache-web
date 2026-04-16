import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const COVERAGE_SCOPE = process.env.COVERAGE_SCOPE ?? "core";
const ENFORCE_COVERAGE = process.env.COVERAGE_ENFORCE === "true";
const COVERAGE_TARGET = process.env.COVERAGE_TARGET ?? "baseline";

const PROJECT_WIDE_COVERAGE_TARGETS = {
  lines: 90,
  functions: 90,
  statements: 90,
  branches: 83,
} as const;

const BASELINE_ALL_COVERAGE_THRESHOLDS = {
  lines: 15,
  functions: 10,
  statements: 15,
  branches: 8,
} as const;

const coverageInclude = (() => {
  if (COVERAGE_SCOPE === "all") return ["src/**/*.{ts,tsx}"];
  if (COVERAGE_SCOPE === "app-api") return ["src/app/api/**/*.{ts,tsx}"];
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
    // Interfaces e types puros (sem runtime executável no bundle)
    "src/types/**",
    // Next App Router entrypoints are better covered by e2e/integration
    // i18n message catalogs are data, not logic
    "src/i18n/**",
    // External integration clients & auth helpers (covered later with integration)
    "src/lib/supabase/**",
    "src/lib/auth/**",
    "src/lib/prisma.ts",
    "src/lib/validations/**",
  ];

  if (COVERAGE_SCOPE !== "app-api") {
    // App router is excluded in all scopes except app-api
    base.push("src/app/**");
  }

  if (COVERAGE_SCOPE === "all") {
    base.push("src/components/booking/ChatBookingPage.tsx");
  }

  if (COVERAGE_SCOPE === "core") {
    base.push("src/services/**");
  }

  if (COVERAGE_SCOPE === "services") {
    // Defer external integrations for a later stage (integration/e2e or contract tests)
    base.push("src/services/auth.ts", "src/services/instagram.ts");
  }

  return base;
})();

const coverageThresholds = (() => {
  if (!ENFORCE_COVERAGE) return undefined;

  if (COVERAGE_SCOPE === "all") {
    if (COVERAGE_TARGET === "project-wide") {
      return PROJECT_WIDE_COVERAGE_TARGETS;
    }

    return BASELINE_ALL_COVERAGE_THRESHOLDS;
  }

  if (COVERAGE_SCOPE === "app-api") {
    return {
      lines: 10,
      functions: 8,
      statements: 10,
      branches: 5,
    };
  }

  if (COVERAGE_SCOPE === "services") {
    return {
      lines: 90,
      functions: 90,
      statements: 90,
      branches: 85,
    };
  }

  return {
    lines: 90,
    functions: 90,
    statements: 90,
    branches: 80,
  };
})();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: coverageInclude,
      exclude: coverageExclude,
      ...(coverageThresholds
        ? {
            thresholds: coverageThresholds,
          }
        : {}),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/image": path.resolve(__dirname, "./src/__mocks__/NextImage.tsx"),
    },
  },
});
