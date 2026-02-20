"use client";

import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSignOut } from "@/hooks/useAuth";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { useProfileMe } from "@/hooks/useProfileMe";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  Home,
  LogOut,
  Scissors,
  User,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ClientSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  target?: "_blank";
  rel?: string;
}

export function ClientSidebar({
  open,
  onOpenChange,
  locale,
}: ClientSidebarProps) {
  const pathname = usePathname();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: profile } = useProfileMe();
  const { bookingHref, shouldShowBooking, isExternal, isInternal } =
    useBookingSettings();

  const isAdmin = profile?.role === "ADMIN";
  const bookingNavItems: NavItem[] =
    shouldShowBooking && bookingHref
      ? [
          {
            href: bookingHref,
            label: "Agendar",
            icon: <Calendar className="h-5 w-5" />,
            ...(isExternal
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {}),
          },
        ]
      : [];
  const appointmentsNavItems: NavItem[] = isInternal
    ? [
        {
          href: `/${locale}/meus-agendamentos`,
          label: "Meus Agendamentos",
          icon: <ClipboardList className="h-5 w-5" />,
        },
      ]
    : [];

  const navItems: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: "Início",
      icon: <Home className="h-5 w-5" />,
    },
    ...bookingNavItems,
    ...appointmentsNavItems,
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
  ];

  const handleSignOut = () => {
    signOut();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-72 bg-background border-l border-border p-0 flex h-full flex-col"
      >
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
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

        <div className="px-6 pb-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tema
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex min-h-0 flex-1 flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                target={item.target}
                rel={item.rel}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  isActive && "bg-accent text-foreground",
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
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                      "text-amber-500/90 hover:text-amber-500 hover:bg-accent/60",
                      isActive && "bg-accent text-amber-500",
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
            className="w-full justify-start gap-3 px-4 py-3 text-muted-foreground hover:text-red-500 hover:bg-accent/60"
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
