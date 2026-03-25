"use client";

import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import {
  Star,
  LayoutDashboard,
  Gift,
  History,
  Share2,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

interface LoyaltyLayoutContentProps {
  referralEnabled: boolean;
  children: React.ReactNode;
}

export function LoyaltyLayoutContent({
  referralEnabled,
  children,
}: LoyaltyLayoutContentProps) {
  const locale = useLocale();
  const pathname = usePathname();

  usePrivateHeader({
    title: "Fidelidade",
    icon: Star,
    backHref: `/${locale}/dashboard`,
  });

  const baseNavItems = [
    { name: "Dashboard", href: `/${locale}/loyalty`, icon: LayoutDashboard },
    { name: "Recompensas", href: `/${locale}/loyalty/rewards`, icon: Gift },
    {
      name: "Meus Resgates",
      href: `/${locale}/loyalty/redemptions`,
      icon: Ticket,
    },
    { name: "Extrato", href: `/${locale}/loyalty/history`, icon: History },
  ];

  const navItems = referralEnabled
    ? [
        ...baseNavItems,
        {
          name: "Indicar Amigos",
          href: `/${locale}/loyalty/referral`,
          icon: Share2,
        },
      ]
    : baseNavItems;

  return (
    <div className="flex flex-col flex-1">
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-6 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 min-h-11 whitespace-nowrap flex items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
