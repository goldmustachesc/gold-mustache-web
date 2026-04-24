import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BarberServicosPageClient } from "./BarberServicosPageClient";

interface AdminBarberServicesPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminBarberServicesPage({
  params,
}: AdminBarberServicesPageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  return <BarberServicosPageClient />;
}
