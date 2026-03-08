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
import { useProfileMe } from "@/hooks/useProfileMe";
import { cn } from "@/lib/utils";
import {
  Building2,
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  Gift,
  Home,
  Link2,
  LogOut,
  Scissors,
  Star,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  getNavItems,
  getAdminNavItems,
  type NavItemDef,
} from "./private-nav-items";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Calendar,
  CalendarOff,
  Clock,
  DollarSign,
  Gift,
  Home,
  Link2,
  Scissors,
  Star,
  User,
  UserPlus,
  Users,
  XCircle,
  LogOut,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Scissors;
}

interface PrivateSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NavLink({
  item,
  isActive,
  onNavigate,
  variant = "default",
}: {
  item: NavItemDef;
  isActive: boolean;
  onNavigate: () => void;
  variant?: "default" | "admin";
}) {
  const Icon = resolveIcon(item.iconName);
  const isAdmin = variant === "admin";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isAdmin
          ? "text-primary/90 hover:text-primary hover:bg-accent/60"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        isActive &&
          (isAdmin ? "bg-accent text-primary" : "bg-accent text-foreground"),
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{item.label}</span>
    </Link>
  );
}

export function PrivateSidebar({ open, onOpenChange }: PrivateSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const { mutate: signOut, isPending: signOutPending } = useSignOut();
  const { data: profile } = useProfileMe();

  const role = profile?.role ?? "CLIENT";
  const isAdmin = role === "ADMIN";

  const navItems = getNavItems(role, locale);
  const adminItems = getAdminNavItems(locale);

  const handleNavigate = () => onOpenChange(false);

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

        <div className="px-6 pb-8">
          <Link
            href={`/${locale}`}
            className="flex flex-col items-center gap-2"
            onClick={handleNavigate}
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

        <nav className="flex min-h-0 flex-1 flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onNavigate={handleNavigate}
            />
          ))}

          {isAdmin && (
            <>
              <div className="mt-4 mb-2 px-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administração
                </span>
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  onNavigate={handleNavigate}
                  variant="admin"
                />
              ))}
            </>
          )}
        </nav>

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
