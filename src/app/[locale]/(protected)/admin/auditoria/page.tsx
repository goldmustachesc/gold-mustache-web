import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AuditoriaPageClient } from "./AuditoriaPageClient";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    action?: string;
    resourceType?: string;
    actorProfileId?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AuditoriaPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
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

  return (
    <AuditoriaPageClient
      initialFilters={{
        page: query.page,
        action: query.action,
        resourceType: query.resourceType,
        actorProfileId: query.actorProfileId,
        from: query.from,
        to: query.to,
      }}
    />
  );
}
