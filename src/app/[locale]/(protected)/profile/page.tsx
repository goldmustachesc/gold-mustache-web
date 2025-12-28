"use client";

import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { EmailVerificationCard } from "@/components/profile/EmailVerificationCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const params = useParams();
  const locale = params.locale as string;

  const isLoading = userLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/dashboard`}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas informações pessoais
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <ProfileForm profile={profile} userEmail={user?.email} />

      {/* Email Verification */}
      <EmailVerificationCard
        email={user?.email}
        isVerified={profile?.emailVerified ?? false}
      />

      {/* Password Change */}
      <PasswordChangeCard />

      {/* Delete Account */}
      <DeleteAccountCard />
    </div>
  );
}
