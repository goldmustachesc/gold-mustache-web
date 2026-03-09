"use client";

import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { Loader2, Shield, User, Mail } from "lucide-react";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { EmailVerificationCard } from "@/components/profile/EmailVerificationCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  const isLoading = userLoading || profileLoading || barberLoading;
  const isBarber = !!barberProfile;

  usePrivateHeader({ title: "Meu Perfil", icon: User });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
        <div className="mb-8 lg:mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Gerencie seu Perfil
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Atualize suas informações pessoais, endereço e configurações de
            segurança da sua conta
          </p>
        </div>

        <div className="xl:hidden p-4 rounded-xl bg-muted/50 border border-border mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-h-11 min-w-11 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile?.fullName || "Não informado"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {isBarber && (
                <span className="text-primary text-xs font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                  Barbeiro
                </span>
              )}
              {profile?.emailVerified ? (
                <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">
                  Verificado
                </span>
              ) : (
                <span className="text-primary text-xs font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                  Pendente
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="xl:col-span-7 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 min-h-11 min-w-11 flex items-center justify-center bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Dados Pessoais
                </h3>
                <p className="text-sm text-muted-foreground">
                  Informações básicas e endereço
                </p>
              </div>
            </div>

            <ProfileForm profile={profile} userEmail={user?.email} />
          </div>

          <div className="xl:col-span-5 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="p-2 min-h-11 min-w-11 flex items-center justify-center bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Segurança da Conta
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verificação e configurações
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <EmailVerificationCard
                email={user?.email}
                isVerified={profile?.emailVerified ?? false}
              />

              <PasswordChangeCard />

              <div className="hidden xl:block p-5 rounded-xl bg-muted/50 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-4">
                  Resumo da Conta
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </span>
                    <span className="text-foreground truncate max-w-[180px]">
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome
                    </span>
                    <span className="text-foreground truncate max-w-[180px]">
                      {profile?.fullName || "Não informado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Status
                    </span>
                    {profile?.emailVerified ? (
                      <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">
                        Verificado
                      </span>
                    ) : (
                      <span className="text-primary text-xs font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>
                  {isBarber && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">
                        Tipo de conta
                      </span>
                      <span className="text-primary text-xs font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                        Barbeiro
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <DeleteAccountCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
