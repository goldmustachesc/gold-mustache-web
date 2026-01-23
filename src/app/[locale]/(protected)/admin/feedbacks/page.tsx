import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminFeedbacksPage } from "@/components/feedback/AdminFeedbacksPage";

interface FeedbacksAdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FeedbacksAdminPage({
  params,
}: FeedbacksAdminPageProps) {
  const { locale } = await params;

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

  // Get barbers for filter dropdown
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <AdminFeedbacksPage locale={locale} barbers={barbers} />;
}
