"use client";

import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSignOut } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  Link2,
  LogOut,
  Scissors,
  Star,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BarberSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function BarberSidebar({
  open,
  onOpenChange,
  locale,
}: BarberSidebarProps) {
  const pathname = usePathname();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: profile } = useProfileMe();

  const isAdmin = profile?.role === "ADMIN";

  const navItems: NavItem[] = [
    {
      href: `/${locale}/barbeiro`,
      label: "Início",
      icon: <Scissors className="h-5 w-5" />,
    },
    {
      href: `/${locale}/dashboard`,
      label: "Minha Agenda",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/meu-link`,
      label: "Meu Link",
      icon: <Link2 className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/clientes`,
      label: "Clientes",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/agendar`,
      label: "Agendar para Cliente",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/horarios`,
      label: "Meus Horários",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/ausencias`,
      label: "Ausências",
      icon: <CalendarOff className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/cancelados`,
      label: "Cancelados",
      icon: <XCircle className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/faturamento`,
      label: "Faturamento",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      href: `/${locale}/barbeiro/feedbacks`,
      label: "Minhas Avaliações",
      icon: <Star className="h-5 w-5" />,
    },
    {
      href: `/${locale}/profile`,
      label: "Meu Perfil",
      icon: <User className="h-5 w-5" />,
    },
  ];

  // Admin-only menu items
  const adminItems: NavItem[] = [
    {
      href: `/${locale}/admin/barbearia/configuracoes`,
      label: "Dados da Barbearia",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      href: `/${locale}/admin/barbearia/horarios`,
      label: "Horários da Barbearia",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: `/${locale}/admin/barbearia/servicos`,
      label: "Serviços",
      icon: <Scissors className="h-5 w-5" />,
    },
    {
      href: `/${locale}/admin/barbeiros`,
      label: "Gerenciar Barbeiros",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: `/${locale}/admin/faturamento`,
      label: "Faturamento Geral",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      href: `/${locale}/admin/feedbacks`,
      label: "Avaliações",
      icon: <Star className="h-5 w-5" />,
    },
  ];

  const handleSignOut = () => {
    signOut();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-72 bg-[#1a1a1a] border-l border-zinc-800 p-0 flex h-full flex-col"
      >
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="sr-only">Menu do Barbeiro</SheetTitle>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Logo */}
        <div className="px-6 pb-8">
          <Link
            href={`/${locale}`}
            className="flex flex-col items-center gap-2"
            onClick={() => onOpenChange(false)}
          >
            <Image
              src="/logo.png"
              alt="Gold Mustache"
              width={48}
              height={48}
              className="rounded-full"
            />
            <BrandWordmark className="text-2xl">GOLD MUSTACHE</BrandWordmark>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex min-h-0 flex-1 flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  "text-zinc-300 hover:text-white hover:bg-zinc-800/50",
                  isActive && "bg-zinc-800 text-white",
                )}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="mt-4 mb-2 px-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Administração
                </span>
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      "text-amber-400/80 hover:text-amber-400 hover:bg-zinc-800/50",
                      isActive && "bg-zinc-800 text-amber-400",
                    )}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto px-4 pb-6">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            disabled={signOutPending}
            className="w-full justify-start gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">
              {signOutPending ? "Saindo..." : "Sair"}
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
