"use client";

import { useUser } from "@/hooks/useAuth";
import {
  Loader2,
  ArrowLeft,
  Star,
  Menu,
  Home,
  Calendar,
  LayoutDashboard,
  Gift,
  History,
  Share2,
  User,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

export default function LoyaltyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, isLoading: userLoading } = useUser();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;

  const isLoading = userLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: `/${locale}/loyalty`, icon: LayoutDashboard },
    { name: "Recompensas", href: `/${locale}/loyalty/rewards`, icon: Gift },
    { name: "Extrato", href: `/${locale}/loyalty/history`, icon: History },
    {
      name: "Indicar Amigos",
      href: `/${locale}/loyalty/referral`,
      icon: Share2,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only lg:not-sr-only">Voltar</span>
            </Link>

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

            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500" />
              <h1 className="text-xl font-bold">Fidelidade</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {user?.email && (
              <span className="text-sm text-zinc-400 hidden xl:inline">
                {user.email}
              </span>
            )}

            {user?.id && <NotificationPanel userId={user.id} />}

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
                <DropdownMenuItem asChild>
                  <Link
                    href={`/${locale}/profile`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-6 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 whitespace-nowrap flex items-center gap-2 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-amber-500 text-amber-500"
                    : "border-transparent text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
