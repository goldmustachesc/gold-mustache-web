"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/ui/video-embed";
import { EVENTS_SECTION } from "@/config/events";
import { BRAND } from "@/constants/brand";
import { MessageCircle, PartyPopperIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function EventsSection() {
  const t = useTranslations("events");
  const { heading, subheading, videoId, strong } = EVENTS_SECTION;

  const whatsappMessage = encodeURIComponent(t("whatsappMessage"));
  const whatsappUrl = `https://wa.me/${BRAND.contact.whatsapp}?text=${whatsappMessage}`;

  return (
    <SectionLayout
      id="eventos"
      icon={PartyPopperIcon}
      badge={t("badge")}
      title={heading}
      titleAccent={strong}
      description={subheading}
    >
      <RevealOnScroll delay={0.1}>
        <div className="mx-auto max-w-4xl">
          <VideoEmbed videoId={videoId} title={heading} />
        </div>
      </RevealOnScroll>

      <RevealOnScroll delay={0.2}>
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xl font-semibold">{t("cta.title")}</p>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("cta.description")}
          </p>
          <Button asChild className="mt-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{t("cta.button")}</span>
            </a>
          </Button>
        </div>
      </RevealOnScroll>
    </SectionLayout>
  );
}
