import { resolveBookingMode } from "@/lib/booking-mode";
import { getBarbershopSettings } from "@/services/barbershop-settings";
import { redirect } from "next/navigation";

export default async function BarberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const settings = await getBarbershopSettings();
  const mode = resolveBookingMode(settings);

  if (mode !== "internal") {
    redirect(`/${locale}/dashboard`);
  }

  return <>{children}</>;
}
