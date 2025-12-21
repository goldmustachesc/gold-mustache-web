/**
 * Configuração central do site
 * Suporta múltiplos ambientes: development, staging, production
 */

export type Environment = "development" | "staging" | "production";

/**
 * Detecta o ambiente atual baseado em variáveis de ambiente
 */
function detectEnvironment(): Environment {
  // Prioridade: NEXT_PUBLIC_ENVIRONMENT > inferência por URL
  const envVar = process.env.NEXT_PUBLIC_ENVIRONMENT;

  if (
    envVar === "production" ||
    envVar === "staging" ||
    envVar === "development"
  ) {
    return envVar;
  }

  // Inferência por URL do Vercel
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";

  // Fallback para development
  return "development";
}

/**
 * Obtém a URL base do site
 */
function getBaseUrl(): string {
  // Prioridade: NEXT_PUBLIC_SITE_URL > VERCEL_URL > localhost
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export const siteConfig = {
  /**
   * Ambiente atual: development, staging ou production
   */
  environment: detectEnvironment(),

  /**
   * URL base do site (sem trailing slash)
   */
  baseUrl: getBaseUrl(),

  /**
   * URL de produção (hardcoded para referência)
   */
  productionUrl: "https://www.goldmustachebarbearia.com.br",

  /**
   * Verifica se está em produção
   */
  isProduction: detectEnvironment() === "production",

  /**
   * Verifica se está em staging
   */
  isStaging: detectEnvironment() === "staging",

  /**
   * Verifica se está em desenvolvimento
   */
  isDevelopment: detectEnvironment() === "development",

  /**
   * Verifica se crawlers devem ser permitidos (apenas em produção)
   */
  allowCrawlers: detectEnvironment() === "production",

  /**
   * Verifica se analytics devem ser habilitados (apenas em produção)
   */
  enableAnalytics: detectEnvironment() === "production",
} as const;
