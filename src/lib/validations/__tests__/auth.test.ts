import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  resetSchema,
  newPasswordSchema,
} from "../auth";

describe("lib/validations/auth", () => {
  describe("loginSchema", () => {
    it("should validate valid login data", () => {
      const validData = {
        email: "test@example.com",
        password: "123456",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty email", () => {
      const invalidData = {
        email: "",
        password: "123456",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Email é obrigatório");
      }
    });

    it("should reject invalid email format", () => {
      const invalidData = {
        email: "invalid-email",
        password: "123456",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Email inválido");
      }
    });

    it("should reject password shorter than 6 characters", () => {
      const invalidData = {
        email: "test@example.com",
        password: "12345",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mínimo 6 caracteres");
      }
    });
  });

  describe("signupSchema", () => {
    const validSignupData = {
      fullName: "João Silva",
      phone: "(11) 99999-9999",
      email: "test@example.com",
      password: "123456",
      confirmPassword: "123456",
    };

    it("should validate valid signup data", () => {
      const result = signupSchema.safeParse(validSignupData);
      expect(result.success).toBe(true);
    });

    describe("fullName validation", () => {
      it("should reject empty fullName", () => {
        const invalidData = { ...validSignupData, fullName: "" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Nome é obrigatório");
        }
      });

      it("should reject fullName with less than 2 characters", () => {
        const invalidData = { ...validSignupData, fullName: "A" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Nome deve ter pelo menos 2 caracteres",
          );
        }
      });

      it("should reject fullName with more than 100 characters", () => {
        const invalidData = { ...validSignupData, fullName: "A".repeat(101) };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Nome deve ter no máximo 100 caracteres",
          );
        }
      });

      it("should accept fullName with exactly 2 characters", () => {
        const validData = { ...validSignupData, fullName: "Jo" };

        const result = signupSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it("should accept fullName with exactly 100 characters", () => {
        const validData = { ...validSignupData, fullName: "A".repeat(100) };

        const result = signupSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    describe("phone validation", () => {
      it("should reject empty phone", () => {
        const invalidData = { ...validSignupData, phone: "" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Telefone é obrigatório");
        }
      });

      it("should reject phone with less than 10 digits", () => {
        const invalidData = { ...validSignupData, phone: "(11) 9999-999" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Telefone deve ter 10 ou 11 dígitos",
          );
        }
      });

      it("should reject phone with more than 11 digits", () => {
        const invalidData = { ...validSignupData, phone: "(11) 99999-99999" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Telefone deve ter 10 ou 11 dígitos",
          );
        }
      });

      it("should accept phone with 10 digits (landline format)", () => {
        const validData = { ...validSignupData, phone: "(11) 3456-7890" };

        const result = signupSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it("should accept phone with 11 digits (mobile format)", () => {
        const validData = { ...validSignupData, phone: "(11) 99999-9999" };

        const result = signupSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it("should accept phone without formatting", () => {
        const validData = { ...validSignupData, phone: "11999999999" };

        const result = signupSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    describe("email validation", () => {
      it("should reject empty email", () => {
        const invalidData = { ...validSignupData, email: "" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Email é obrigatório");
        }
      });

      it("should reject invalid email format", () => {
        const invalidData = { ...validSignupData, email: "invalid-email" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Email inválido");
        }
      });
    });

    describe("password validation", () => {
      it("should reject password shorter than 6 characters", () => {
        const invalidData = {
          ...validSignupData,
          password: "12345",
          confirmPassword: "12345",
        };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Mínimo 6 caracteres");
        }
      });
    });

    describe("confirmPassword validation", () => {
      it("should reject empty confirmPassword", () => {
        const invalidData = { ...validSignupData, confirmPassword: "" };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(
            "Confirmação é obrigatória",
          );
        }
      });

      it("should reject when passwords do not match", () => {
        const invalidData = {
          ...validSignupData,
          password: "123456",
          confirmPassword: "654321",
        };

        const result = signupSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          const confirmError = result.error.issues.find(
            (issue) => issue.path[0] === "confirmPassword",
          );
          expect(confirmError?.message).toBe("Senhas não conferem");
        }
      });
    });
  });

  describe("resetSchema", () => {
    it("should validate valid reset data", () => {
      const validData = { email: "test@example.com" };

      const result = resetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty email", () => {
      const invalidData = { email: "" };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Email é obrigatório");
      }
    });

    it("should reject invalid email format", () => {
      const invalidData = { email: "invalid-email" };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Email inválido");
      }
    });
  });

  describe("newPasswordSchema", () => {
    it("should validate valid new password data", () => {
      const validData = {
        password: "123456",
        confirmPassword: "123456",
      };

      const result = newPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 6 characters", () => {
      const invalidData = {
        password: "12345",
        confirmPassword: "12345",
      };

      const result = newPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mínimo 6 caracteres");
      }
    });

    it("should reject empty confirmPassword", () => {
      const invalidData = {
        password: "123456",
        confirmPassword: "",
      };

      const result = newPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Confirmação é obrigatória",
        );
      }
    });

    it("should reject when passwords do not match", () => {
      const invalidData = {
        password: "123456",
        confirmPassword: "654321",
      };

      const result = newPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(
          (issue) => issue.path[0] === "confirmPassword",
        );
        expect(confirmError?.message).toBe("Senhas não conferem");
      }
    });
  });
});
