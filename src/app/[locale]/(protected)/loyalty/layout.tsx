import { isFeatureEnabled } from "@/services/feature-flags";
import { notFound } from "next/navigation";
import { LoyaltyLayoutContent } from "./LoyaltyLayoutContent";

export default async function LoyaltyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loyaltyEnabled, referralEnabled] = await Promise.all([
    isFeatureEnabled("loyaltyProgram"),
    isFeatureEnabled("referralProgram"),
  ]);

  if (!loyaltyEnabled) {
    notFound();
  }

  return (
    <LoyaltyLayoutContent referralEnabled={referralEnabled}>
      {children}
    </LoyaltyLayoutContent>
  );
}
