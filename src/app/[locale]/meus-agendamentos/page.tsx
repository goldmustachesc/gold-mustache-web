import { resolveBookingMode } from "@/lib/booking-mode";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { redirect } from "next/navigation";
import { MeusAgendamentosClient } from "./MeusAgendamentosClient";

export default async function MeusAgendamentosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const settings = await getBarbershopSettings();
  const mode = resolveBookingMode(settings);

  if (mode === "external" && settings.externalBookingUrl) {
    redirect(settings.externalBookingUrl);
  }

  if (mode !== "internal") {
    redirect(`/${locale}`);
  }

  return <MeusAgendamentosClient />;
}
