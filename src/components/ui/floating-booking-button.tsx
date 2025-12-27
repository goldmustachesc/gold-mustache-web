"use client";

import { trackBookingClick } from "@/components/analytics/GoogleAnalytics";
import { Button } from "@/components/ui/button";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

export function FloatingBookingButton() {
  const { isScrolledPastThreshold } = useScrollPosition(300);
  const locale = useLocale();
  const bookingLink = `/${locale}/agendar`;

  if (!isScrolledPastThreshold) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        size="lg"
        className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-semibold px-6 py-3 h-auto"
        aria-label="Agendar horário na barbearia"
        asChild
      >
        <Link
          href={bookingLink}
          className="flex items-center"
          onClick={() => trackBookingClick()}
        >
          <Calendar className="mr-2 h-5 w-5" />
          Agendar
        </Link>
      </Button>
    </div>
  );
}
