export interface PrismaErrorConfig {
  message: string;
  status: number;
}

export const PRISMA_ERROR_MESSAGES: Record<string, PrismaErrorConfig> = {
  P2002: { message: "Já existe um registro com esses dados", status: 409 },
  P2003: {
    message:
      "Não foi possível completar a operação devido a referências existentes",
    status: 400,
  },
  P2025: { message: "Registro não encontrado", status: 404 },
  P2024: {
    message:
      "Servidor temporariamente indisponível. Tente novamente em alguns segundos",
    status: 503,
  },
  P1001: {
    message: "Não foi possível conectar ao banco de dados",
    status: 503,
  },
  P2028: {
    message: "A operação demorou muito tempo. Tente novamente",
    status: 504,
  },
};
