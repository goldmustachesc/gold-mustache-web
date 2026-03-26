import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { BarberFeedbacksPage } from "@/components/feedback/BarberFeedbacksPage";

interface FeedbacksPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FeedbacksPage({ params }: FeedbacksPageProps) {
  const { locale } = await params;

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check if user is a barber
  const barber = await prisma.barber.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  if (!barber) {
    redirect(`/${locale}/dashboard`);
  }

  return <BarberFeedbacksPage locale={locale} barberName={barber.name} />;
}
