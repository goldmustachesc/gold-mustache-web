import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminBarberFeedbacksPage } from "@/components/feedback/AdminBarberFeedbacksPage";

interface BarberFeedbacksAdminPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function BarberFeedbacksAdminPage({
  params,
}: BarberFeedbacksAdminPageProps) {
  const { locale, id: barberId } = await params;

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check if user is admin
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  // Get barber info
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    select: { id: true, name: true, avatarUrl: true },
  });

  if (!barber) {
    notFound();
  }

  return <AdminBarberFeedbacksPage locale={locale} barber={barber} />;
}
