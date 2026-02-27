import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET, POST } from "../route";
import { Decimal } from "@prisma/client/runtime/library";
import type { RequireAdminResult } from "@/lib/auth/requireAdmin";

const mockRequireAdmin = vi.fn<() => Promise<RequireAdminResult>>();

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/api/verify-origin", () => ({
  requireValidOrigin: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("/api/admin/loyalty/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      userId: "admin-user-id",
      profileId: "admin-profile-id",
      role: "ADMIN",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("deve retornar lista de rewards com sucesso", async () => {
      const mockRewards = [
        {
          id: "1",
          name: "Corte Grátis",
          description: "Corte de cabelo grátis",
          pointsCost: 1000,
          type: "FREE_SERVICE",
          value: null,
          serviceId: null,
          imageUrl: null,
          active: true,
          stock: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { redemptions: 5 },
        },
      ];

      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.reward.findMany).mockResolvedValue(mockRewards);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toMatchObject({
        id: "1",
        name: "Corte Grátis",
        costInPoints: 1000,
        active: true,
        totalRedemptions: 5,
      });
    });

    it("deve retornar erro em caso de falha no banco", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.reward.findMany).mockRejectedValue(
        new Error("Database error"),
      );

      // Mock console.error para não falhar o teste
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("INTERNAL_ERROR");
      expect(data.message).toBe("Erro ao buscar recompensas");

      // Restaurar console.error
      consoleSpy.mockRestore();
    });
  });

  describe("POST", () => {
    it("deve criar um novo reward com sucesso", async () => {
      const newReward = {
        name: "Novo Reward",
        description: "Descrição do reward",
        pointsCost: 500,
        type: "DISCOUNT",
        value: 15,
        active: true,
      };

      const createdReward = {
        id: "2",
        ...newReward,
        imageUrl: null,
        serviceId: null,
        stock: null,
        value: new Decimal(15),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.reward.create).mockResolvedValue(createdReward);

      const request = {
        json: async () => newReward,
      } as Request;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toMatchObject({
        name: "Novo Reward",
        costInPoints: 500,
        type: "DISCOUNT",
        value: "15", // Decimal é convertido para string no JSON
      });
    });

    it("deve rejeitar dados inválidos", async () => {
      const invalidReward = {
        name: "", // Nome vazio
        pointsCost: -100, // Valor negativo
        type: "INVALID_TYPE", // Tipo inválido
      };

      // Mock console.error para não falhar o teste
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = {
        json: async () => invalidReward,
      } as Request;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("VALIDATION_ERROR");
      expect(data.message).toBeDefined();

      // Restaurar console.error
      consoleSpy.mockRestore();
    });
  });
});
