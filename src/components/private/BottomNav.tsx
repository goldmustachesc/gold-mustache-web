"use client";

import { useProfileMe } from "@/hooks/useProfileMe";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Gift,
  Home,
  Menu,
  Scissors,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { usePrivateSidebarState } from "./PrivateHeaderContext";
import { mobileBottomNavHeightClassName } from "./mobile-nav-layout";

interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchMode?: "exact" | "prefix" | "none";
  linkTarget?: string;
  linkRel?: string;
}

interface BottomNavSidebarItem {
  label: string;
  icon: LucideIcon;
  action: "sidebar";
}

type NavEntry = BottomNavItem | BottomNavSidebarItem;

interface BottomNavBookingSettings {
  bookingHref: string | null;
  shouldShowBooking: boolean;
  isExternal: boolean;
}

interface BottomNavFeatureFlags {
  loyaltyProgram?: boolean;
}

function isSidebarItem(item: NavEntry): item is BottomNavSidebarItem {
  return "action" in item && item.action === "sidebar";
}

function getBottomNavItems(
  role: string,
  locale: string,
  bookingSettings: BottomNavBookingSettings,
  featureFlags?: BottomNavFeatureFlags,
): NavEntry[] {
  const moreItem: BottomNavSidebarItem = {
    label: "Mais",
    icon: Menu,
    action: "sidebar",
  };

  if (role === "BARBER") {
    return [
      {
        href: `/${locale}/barbeiro`,
        label: "Início",
        icon: Scissors,
        matchMode: "exact",
      },
      {
        href: `/${locale}/dashboard`,
        label: "Agenda",
        icon: Calendar,
        matchMode: "exact",
      },
      {
        href: `/${locale}/barbeiro/clientes`,
        label: "Clientes",
        icon: Users,
        matchMode: "prefix",
      },
      moreItem,
    ];
  }

  if (role === "ADMIN") {
    return [
      {
        href: `/${locale}/dashboard`,
        label: "Início",
        icon: Home,
        matchMode: "exact",
      },
      {
        href: `/${locale}/admin/barbeiros`,
        label: "Equipe",
        icon: Users,
        matchMode: "prefix",
      },
      {
        href: `/${locale}/admin/barbearia/servicos`,
        label: "Serviços",
        icon: Scissors,
        matchMode: "exact",
      },
      moreItem,
    ];
  }

  const items: NavEntry[] = [
    {
      href: `/${locale}/dashboard`,
      label: "Início",
      icon: Home,
      matchMode: "exact",
    },
  ];

  if (bookingSettings.shouldShowBooking && bookingSettings.bookingHref) {
    items.push({
      href: bookingSettings.bookingHref,
      label: "Agendar",
      icon: Calendar,
      matchMode: bookingSettings.isExternal ? "none" : "exact",
      linkTarget: bookingSettings.isExternal ? "_blank" : undefined,
      linkRel: bookingSettings.isExternal ? "noopener noreferrer" : undefined,
    });
  }

  // Shows loyalty when flag is true or undefined (backwards compatible default)
  if (featureFlags?.loyaltyProgram !== false) {
    items.push({
      href: `/${locale}/loyalty`,
      label: "Fidelidade",
      icon: Gift,
      matchMode: "prefix",
    });
  }

  items.push(moreItem);

  return items;
}

function isActive(pathname: string, item: BottomNavItem): boolean {
  if (item.matchMode === "none") {
    return false;
  }

  if (item.matchMode === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return pathname === item.href;
}

export function BottomNav() {
  const { data: profile } = useProfileMe();
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();
  const pathname = usePathname();
  const locale = useLocale();
  const { onOpenChange } = usePrivateSidebarState();
  const flags = useFeatureFlags();

  if (!profile) return null;

  const items = getBottomNavItems(
    profile.role,
    locale,
    { bookingHref, shouldShowBooking, isExternal },
    flags,
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => {
          if (isSidebarItem(item)) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onOpenChange(true)}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors active:bg-accent/50",
                  mobileBottomNavHeightClassName,
                )}
              >
                <item.icon className="size-5" />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </button>
            );
          }

          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.linkTarget}
              rel={item.linkRel}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors active:bg-accent/50",
                mobileBottomNavHeightClassName,
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
