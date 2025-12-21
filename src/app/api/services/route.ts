import { NextResponse } from "next/server";
import { getServices } from "@/services/booking";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId") ?? undefined;

    const services = await getServices(barberId);

    return NextResponse.json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Erro ao buscar serviços" },
      { status: 500 },
    );
  }
}
