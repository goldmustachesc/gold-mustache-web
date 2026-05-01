import { isFeatureEnabled } from "@/services/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { LoyaltyLayoutContent } from "./LoyaltyLayoutContent";

export default async function LoyaltyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [supabase, loyaltyEnabled, referralEnabled] = await Promise.all([
    createClient(),
    isFeatureEnabled("loyaltyProgram"),
    isFeatureEnabled("referralProgram"),
  ]);

  if (!loyaltyEnabled) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/loyalty`);
  }

  return (
    <LoyaltyLayoutContent referralEnabled={referralEnabled}>
      {children}
    </LoyaltyLayoutContent>
  );
}
