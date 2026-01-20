"use client";

import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  Loader2,
  ArrowLeft,
  UserCircle,
  Menu,
  Home,
  Calendar,
  Shield,
  User,
  Mail,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { EmailVerificationCard } from "@/components/profile/EmailVerificationCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";
import { BarberSidebar } from "@/components/dashboard/BarberSidebar";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const params = useParams();
  const locale = params.locale as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoading = userLoading || profileLoading || barberLoading;
  const isBarber = !!barberProfile;

  // Determine where to go back
  const backUrl = isBarber ? `/${locale}/barbeiro` : `/${locale}/dashboard`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Sidebar for barbers */}
      {isBarber && (
        <BarberSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          locale={locale}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={backUrl}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

            {/* Logo (visible on desktop) */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={`/${locale}`} className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Gold Mustache"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <BrandWordmark className="text-xl">GOLD MUSTACHE</BrandWordmark>
              </Link>
            </div>

            {/* Page Title */}
            <div className="flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-bold">Meu Perfil</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {user?.email && (
              <span className="text-sm text-zinc-400 hidden xl:inline">
                {user.email}
              </span>
            )}

            {user?.id && <NotificationPanel userId={user.id} />}

            {isBarber ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Menu className="h-6 w-6" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-zinc-800 border-zinc-700"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${locale}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Home className="h-4 w-4" />
                      Início
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/${locale}/dashboard`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Calendar className="h-4 w-4" />
                      Meus Agendamentos
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">
        {/* Page Header */}
        <div className="mb-8 lg:mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Gerencie seu Perfil
          </h2>
          <p className="text-zinc-400 max-w-2xl">
            Atualize suas informações pessoais, endereço e configurações de
            segurança da sua conta
          </p>
        </div>

        {/* Desktop: Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Main Content - Profile Form */}
          <div className="xl:col-span-7 space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Dados Pessoais
                </h3>
                <p className="text-sm text-zinc-400">
                  Informações básicas e endereço
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <ProfileForm profile={profile} userEmail={user?.email} />
          </div>

          {/* Sidebar - Security Settings */}
          <div className="xl:col-span-5 space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Segurança da Conta
                </h3>
                <p className="text-sm text-zinc-400">
                  Verificação e configurações
                </p>
              </div>
            </div>

            {/* Security Cards */}
            <div className="space-y-6">
              {/* Email Verification */}
              <EmailVerificationCard
                email={user?.email}
                isVerified={profile?.emailVerified ?? false}
              />

              {/* Password Change */}
              <PasswordChangeCard />

              {/* Account Summary Card - Desktop Only */}
              <div className="hidden xl:block p-5 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <h4 className="text-sm font-semibold text-zinc-300 mb-4">
                  Resumo da Conta
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </span>
                    <span className="text-zinc-300 truncate max-w-[180px]">
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome
                    </span>
                    <span className="text-zinc-300 truncate max-w-[180px]">
                      {profile?.fullName || "Não informado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Status
                    </span>
                    {profile?.emailVerified ? (
                      <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 rounded-full">
                        Verificado
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs font-medium px-2 py-0.5 bg-amber-500/10 rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>
                  {isBarber && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-700/50">
                      <span className="text-zinc-400">Tipo de conta</span>
                      <span className="text-amber-400 text-xs font-medium px-2 py-0.5 bg-amber-500/10 rounded-full">
                        Barbeiro
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Account - Full Width */}
              <DeleteAccountCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
