"use client";

import { BrandWordmark } from "@/components/ui/brand-wordmark";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useUser } from "@/hooks/useAuth";
import { useProfileMe } from "@/hooks/useProfileMe";
import { ArrowLeft, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  usePrivateHeaderConfig,
  usePrivateSidebarState,
  useActionsContainerRef,
} from "./PrivateHeaderContext";

function extractFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

export function PrivateHeader() {
  const { title, icon: Icon, backHref } = usePrivateHeaderConfig();
  const { onOpenChange } = usePrivateSidebarState();
  const actionsContainerRef = useActionsContainerRef();
  const { data: user } = useUser();
  const { data: profile } = useProfileMe();
  const locale = useLocale();

  const firstName = extractFirstName(profile?.fullName);

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between px-4 h-14 lg:h-16 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/${locale}`}
            className="hidden lg:flex items-center gap-3 shrink-0"
          >
            <Image
              src="/logo.png"
              alt="Gold Mustache"
              width={36}
              height={36}
              className="rounded-full"
            />
            <BrandWordmark className="text-lg">GOLD MUSTACHE</BrandWordmark>
          </Link>

          {(backHref || title) && (
            <div className="flex items-center gap-2 min-w-0 lg:ml-4 lg:pl-4 lg:border-l lg:border-border">
              {backHref && (
                <Link
                  href={backHref}
                  aria-label="Voltar"
                  className="flex items-center justify-center min-h-11 min-w-11 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}
              {title && (
                <div className="flex items-center gap-2 min-w-0">
                  {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
                  <h1 className="text-lg font-semibold truncate">{title}</h1>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div ref={actionsContainerRef} className="contents" />

          {user?.id && <NotificationPanel userId={user.id} />}

          {firstName && (
            <span className="hidden xl:inline text-sm text-muted-foreground">
              {firstName}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(true)}
            aria-label="Menu"
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
