import { VerifyEmailCard } from "@/components/auth/VerifyEmailCard";
import { Suspense } from "react";

interface VerifyEmailPageProps {
  // Next.js 15+: `params` é uma Promise (acesso síncrono ainda funciona por compat,
  // mas tende a ser depreciado). Mantemos o padrão do app (`await params`).
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
