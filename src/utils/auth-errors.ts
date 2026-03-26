/**
 * Maps Supabase Auth error messages to translation keys
 */
const SUPABASE_ERROR_MAP: Record<string, string> = {
  // Common Supabase error messages -> translation keys
  "Email not confirmed": "emailNotConfirmed",
  "Invalid login credentials": "invalidCredentials",
  "Invalid email or password": "invalidCredentials",
  "User not found": "userNotFound",
  "User already registered": "emailAlreadyExists",
  "Password should be at least 6 characters": "weakPassword",
  "For security purposes, you can only request this once every 60 seconds":
    "tooManyRequests",
  "Email rate limit exceeded": "tooManyRequests",
};

/**
 * Default translated messages for each error key (pt-BR as fallback)
 */
const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  emailNotConfirmed: "Por favor, confirme seu email para continuar",
  invalidCredentials: "Email ou senha incorretos",
  userNotFound: "Usuário não encontrado",
  emailAlreadyExists: "Este email já está cadastrado",
  weakPassword: "Senha muito fraca",
  tooManyRequests: "Muitas tentativas. Aguarde um momento",
  generic: "Ocorreu um erro. Tente novamente",
};

/**
 * Gets the translation key for a Supabase error message
 */
export function getAuthErrorKey(errorMessage: string): string {
  // Check exact match
  if (SUPABASE_ERROR_MAP[errorMessage]) {
    return SUPABASE_ERROR_MAP[errorMessage];
  }

  // Check partial match
  for (const [pattern, key] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return key;
    }
  }

  return "generic";
}

/**
 * Translates a Supabase error message to a user-friendly message
 * Falls back to Portuguese if no translation is provided
 */
export function translateAuthError(
  errorMessage: string,
  translations?: Record<string, string>,
): string {
  const errorKey = getAuthErrorKey(errorMessage);

  // If translations are provided, use them
  if (translations?.[errorKey]) {
    return translations[errorKey];
  }

  // Fall back to default Portuguese messages
  return DEFAULT_ERROR_MESSAGES[errorKey] || DEFAULT_ERROR_MESSAGES.generic;
}

/**
 * Checks if the error is an "email not confirmed" error
 */
export function isEmailNotConfirmedError(errorMessage: string): boolean {
  return getAuthErrorKey(errorMessage) === "emailNotConfirmed";
}

/**
 * Type for auth error translation keys
 */
export type AuthErrorKey =
  | "emailNotConfirmed"
  | "invalidCredentials"
  | "userNotFound"
  | "emailAlreadyExists"
  | "weakPassword"
  | "tooManyRequests"
  | "generic";

/**
 * Creates error translations object from a translation function
 * Reduces duplication in hooks that need to translate auth errors
 */
export function createAuthErrorTranslations(
  t: (key: string) => string,
): Record<AuthErrorKey, string> {
  return {
    emailNotConfirmed: t("errors.emailNotConfirmed"),
    invalidCredentials: t("errors.invalidCredentials"),
    userNotFound: t("errors.userNotFound"),
    emailAlreadyExists: t("errors.emailAlreadyExists"),
    weakPassword: t("errors.weakPassword"),
    tooManyRequests: t("errors.tooManyRequests"),
    generic: t("errors.generic"),
  };
}
