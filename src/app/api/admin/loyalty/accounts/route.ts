import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    // Retornando mock data para exibição no frontend enquanto backend real não está finalizado.
    const mockAccounts = [
      {
        id: "1",
        userId: "u1",
        fullName: "Leonardo B.",
        email: "leo@example.com",
        points: 1200,
        tier: "SILVER",
      },
      {
        id: "2",
        userId: "u2",
        fullName: "Maria Silva",
        email: "maria@example.com",
        points: 300,
        tier: "BRONZE",
      },
      {
        id: "3",
        userId: "u3",
        fullName: "João Pedro",
        email: "joao@example.com",
        points: 3500,
        tier: "DIAMOND",
      },
    ];

    return NextResponse.json({
      success: true,
      accounts: mockAccounts,
    });
  } catch (error) {
    return handlePrismaError(error, "Erro ao buscar contas de fidelidade");
  }
}
