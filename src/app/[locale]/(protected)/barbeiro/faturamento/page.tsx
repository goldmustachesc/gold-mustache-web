import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FinancialPage } from "@/components/financial";

interface FaturamentoPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FaturamentoPage({
  params,
}: FaturamentoPageProps) {
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

  return <FinancialPage locale={locale} />;
}
