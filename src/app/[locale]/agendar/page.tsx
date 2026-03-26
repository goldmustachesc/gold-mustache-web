import { resolveBookingMode } from "@/lib/booking-mode";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import {
  getPublicBarbersWithCache,
  getPublicServicesWithCache,
} from "@/services/booking";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { AgendarPageClient } from "./AgendarPageClient";

export default async function AgendarPage({
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

  const queryClient = new QueryClient();
  const [barbers, services] = await Promise.all([
    getPublicBarbersWithCache(),
    getPublicServicesWithCache(),
  ]);

  queryClient.setQueryData(["barbers"], barbers);
  queryClient.setQueryData(["services", undefined], services);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AgendarPageClient />
    </HydrationBoundary>
  );
}
