import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AgendamentosPageClient } from "./AgendamentosPageClient";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AgendamentosPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  return <AgendamentosPageClient />;
}
