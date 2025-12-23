import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { Suspense } from "react";

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>;
}

export default async function VerifyEmailPage({
  params,
}: VerifyEmailPageProps) {
  const { locale } = await params;

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerifyEmailCard locale={locale} />
    </Suspense>
  );
}
