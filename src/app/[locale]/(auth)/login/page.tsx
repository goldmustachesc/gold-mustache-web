import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;

  return (
    <Suspense>
      <LoginForm locale={locale} />
    </Suspense>
  );
}
