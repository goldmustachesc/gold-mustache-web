import { describe, it, expect } from "vitest";
import { mapServiceErrorToResponse } from "../service-error-mapper";

describe("mapServiceErrorToResponse", () => {
  it("should return 404 for feminine 'não encontrada' messages", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Recompensa não encontrada."),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("NOT_FOUND");
    expect(data.message).toBe("Recompensa não encontrada.");
  });

  it("should return 404 for masculine 'não encontrado' messages", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Código de resgate não encontrado."),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("NOT_FOUND");
    expect(data.message).toBe("Código de resgate não encontrado.");
  });

  it("should return 400 for other service errors", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Saldo de pontos insuficiente."),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("BAD_REQUEST");
    expect(data.message).toBe("Saldo de pontos insuficiente.");
  });

  it("should return 400 for 'não está ativa' messages", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Recompensa não está ativa."),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for 'já foi utilizado' messages", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Código de resgate já foi utilizado."),
    );

    expect(response.status).toBe(400);
  });

  it("should return 400 for 'expirado' messages", async () => {
    const response = mapServiceErrorToResponse(
      new Error("Código de resgate expirado."),
    );

    expect(response.status).toBe(400);
  });
});
