"use client";

import { trackBookingClick } from "@/components/analytics/GoogleAnalytics";
import { Button } from "@/components/ui/button";
import { useBookingSettings } from "@/hooks/useBookingSettings";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function FloatingBookingButton() {
  const t = useTranslations("common");
  const { isScrolledPastThreshold } = useScrollPosition(300);
  const { bookingHref, shouldShowBooking, isExternal } = useBookingSettings();
  const bookingLinkProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  if (!isScrolledPastThreshold || !shouldShowBooking || !bookingHref) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        size="lg"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-semibold px-6 py-3 h-auto"
        aria-label={t("scheduleAtBarbershop")}
        asChild
      >
        <Link
          href={bookingHref}
          className="flex items-center"
          onClick={() => trackBookingClick()}
          {...bookingLinkProps}
        >
          <Calendar className="mr-2 h-5 w-5" />
          {t("schedule")}
        </Link>
      </Button>
    </div>
  );
}
