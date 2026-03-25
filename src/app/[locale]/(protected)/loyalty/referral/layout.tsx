import { isFeatureEnabled } from "@/services/feature-flags";
import { notFound } from "next/navigation";

export default async function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const referralEnabled = await isFeatureEnabled("referralProgram");

  if (!referralEnabled) {
    notFound();
  }

  return <>{children}</>;
}
