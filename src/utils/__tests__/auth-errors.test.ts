import { describe, it, expect } from "vitest";
import {
  getAuthErrorKey,
  translateAuthError,
  isEmailNotConfirmedError,
  createAuthErrorTranslations,
} from "../auth-errors";

describe("utils/auth-errors", () => {
  describe("getAuthErrorKey", () => {
    it("should return 'emailNotConfirmed' for exact 'Email not confirmed' error", () => {
      expect(getAuthErrorKey("Email not confirmed")).toBe("emailNotConfirmed");
    });

    it("should return 'invalidCredentials' for exact 'Invalid login credentials' error", () => {
      expect(getAuthErrorKey("Invalid login credentials")).toBe(
        "invalidCredentials",
      );
    });

    it("should return 'invalidCredentials' for exact 'Invalid email or password' error", () => {
      expect(getAuthErrorKey("Invalid email or password")).toBe(
        "invalidCredentials",
      );
    });

    it("should return 'userNotFound' for exact 'User not found' error", () => {
      expect(getAuthErrorKey("User not found")).toBe("userNotFound");
    });

    it("should return 'emailAlreadyExists' for exact 'User already registered' error", () => {
      expect(getAuthErrorKey("User already registered")).toBe(
        "emailAlreadyExists",
      );
    });

    it("should return 'weakPassword' for exact 'Password should be at least 6 characters' error", () => {
      expect(getAuthErrorKey("Password should be at least 6 characters")).toBe(
        "weakPassword",
      );
    });

    it("should return 'tooManyRequests' for rate limit error", () => {
      expect(
        getAuthErrorKey(
          "For security purposes, you can only request this once every 60 seconds",
        ),
      ).toBe("tooManyRequests");
    });

    it("should return 'tooManyRequests' for email rate limit error", () => {
      expect(getAuthErrorKey("Email rate limit exceeded")).toBe(
        "tooManyRequests",
      );
    });

    it("should match partial errors case-insensitively", () => {
      expect(getAuthErrorKey("email not confirmed for this user")).toBe(
        "emailNotConfirmed",
      );
      expect(getAuthErrorKey("ERROR: Invalid login credentials!")).toBe(
        "invalidCredentials",
      );
      expect(getAuthErrorKey("USER NOT FOUND in database")).toBe(
        "userNotFound",
      );
    });

    it("should return 'generic' for unknown errors", () => {
      expect(getAuthErrorKey("Something went wrong")).toBe("generic");
      expect(getAuthErrorKey("Unknown error occurred")).toBe("generic");
      expect(getAuthErrorKey("")).toBe("generic");
    });
  });

  describe("translateAuthError", () => {
    const mockTranslations = {
      emailNotConfirmed: "Please confirm your email",
      invalidCredentials: "Wrong email or password",
      userNotFound: "User not found",
      emailAlreadyExists: "Email already exists",
      weakPassword: "Password too weak",
      tooManyRequests: "Too many requests",
      generic: "An error occurred",
    };

    it("should return translated message when translations are provided", () => {
      expect(translateAuthError("Email not confirmed", mockTranslations)).toBe(
        "Please confirm your email",
      );
      expect(
        translateAuthError("Invalid login credentials", mockTranslations),
      ).toBe("Wrong email or password");
      expect(translateAuthError("User not found", mockTranslations)).toBe(
        "User not found",
      );
    });

    it("should return default Portuguese message when no translations provided", () => {
      expect(translateAuthError("Email not confirmed")).toBe(
        "Por favor, confirme seu email para continuar",
      );
      expect(translateAuthError("Invalid login credentials")).toBe(
        "Email ou senha incorretos",
      );
      expect(translateAuthError("User not found")).toBe(
        "Usuário não encontrado",
      );
    });

    it("should return default Portuguese message when translation key is missing", () => {
      const partialTranslations = {
        emailNotConfirmed: "Please confirm your email",
        // missing other keys
      };
      expect(
        translateAuthError("Invalid login credentials", partialTranslations),
      ).toBe("Email ou senha incorretos");
    });

    it("should return generic error for unknown errors", () => {
      expect(translateAuthError("Unknown error", mockTranslations)).toBe(
        "An error occurred",
      );
      expect(translateAuthError("Unknown error")).toBe(
        "Ocorreu um erro. Tente novamente",
      );
    });

    it("should handle empty translations object", () => {
      expect(translateAuthError("Email not confirmed", {})).toBe(
        "Por favor, confirme seu email para continuar",
      );
    });

    it("should handle undefined translations", () => {
      expect(translateAuthError("Email not confirmed", undefined)).toBe(
        "Por favor, confirme seu email para continuar",
      );
    });

    it("should return generic default when errorKey is not in DEFAULT_ERROR_MESSAGES", () => {
      // This edge case happens when SUPABASE_ERROR_MAP has a key that maps to
      // an errorKey that doesn't exist in DEFAULT_ERROR_MESSAGES
      // We test this by checking the generic fallback behavior
      const unknownError =
        "completely random error that doesn't match anything";
      expect(translateAuthError(unknownError)).toBe(
        "Ocorreu um erro. Tente novamente",
      );
    });
  });

  describe("createAuthErrorTranslations", () => {
    it("should create translations object from a translation function", () => {
      // Mock translation function
      const mockT = (key: string) => `translated:${key}`;

      const translations = createAuthErrorTranslations(mockT);

      expect(translations.emailNotConfirmed).toBe(
        "translated:errors.emailNotConfirmed",
      );
      expect(translations.invalidCredentials).toBe(
        "translated:errors.invalidCredentials",
      );
      expect(translations.userNotFound).toBe("translated:errors.userNotFound");
      expect(translations.emailAlreadyExists).toBe(
        "translated:errors.emailAlreadyExists",
      );
      expect(translations.weakPassword).toBe("translated:errors.weakPassword");
      expect(translations.tooManyRequests).toBe(
        "translated:errors.tooManyRequests",
      );
      expect(translations.generic).toBe("translated:errors.generic");
    });

    it("should return all required error keys", () => {
      const mockT = (key: string) => key;
      const translations = createAuthErrorTranslations(mockT);

      const expectedKeys = [
        "emailNotConfirmed",
        "invalidCredentials",
        "userNotFound",
        "emailAlreadyExists",
        "weakPassword",
        "tooManyRequests",
        "generic",
      ];

      expect(Object.keys(translations).sort()).toEqual(expectedKeys.sort());
    });

    it("should work with translateAuthError", () => {
      const mockT = (key: string) => {
        const map: Record<string, string> = {
          "errors.invalidCredentials": "Credenciais inválidas",
          "errors.emailNotConfirmed": "Email não confirmado",
          "errors.userNotFound": "Usuário não encontrado",
          "errors.emailAlreadyExists": "Email já existe",
          "errors.weakPassword": "Senha fraca",
          "errors.tooManyRequests": "Muitas tentativas",
          "errors.generic": "Erro genérico",
        };
        return map[key] || key;
      };

      const translations = createAuthErrorTranslations(mockT);

      expect(
        translateAuthError("Invalid login credentials", translations),
      ).toBe("Credenciais inválidas");
      expect(translateAuthError("Email not confirmed", translations)).toBe(
        "Email não confirmado",
      );
    });
  });

  describe("isEmailNotConfirmedError", () => {
    it("should return true for exact 'Email not confirmed' error", () => {
      expect(isEmailNotConfirmedError("Email not confirmed")).toBe(true);
    });

    it("should return true for partial match", () => {
      expect(isEmailNotConfirmedError("email not confirmed for user")).toBe(
        true,
      );
      expect(isEmailNotConfirmedError("Error: EMAIL NOT CONFIRMED")).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isEmailNotConfirmedError("Invalid login credentials")).toBe(false);
      expect(isEmailNotConfirmedError("User not found")).toBe(false);
      expect(isEmailNotConfirmedError("Something went wrong")).toBe(false);
      expect(isEmailNotConfirmedError("")).toBe(false);
    });
  });
});
