import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesPageClient } from "./ConfiguracoesPageClient";

interface AdminSettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminSettingsPage({
  params,
}: AdminSettingsPageProps) {
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

  return <ConfiguracoesPageClient />;
}
