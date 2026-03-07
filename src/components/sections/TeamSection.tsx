"use client";

import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { SectionLayout } from "@/components/shared/SectionLayout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEAM_MEMBERS } from "@/constants/team";
import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

export function TeamSection() {
  const t = useTranslations("team");
  const locale = useLocale() as "pt-BR" | "en" | "es";
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleImageError = (memberId: string) => {
    setImageErrors((prev) => ({ ...prev, [memberId]: true }));
  };

  return (
    <SectionLayout
      id="equipe"
      icon={Users}
      badge={t("badge")}
      title={t("title")}
      description={t("description")}
      className="py-20 bg-muted/30"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {TEAM_MEMBERS.map((member, index) => (
          <RevealOnScroll key={member.id} delay={index * 0.1}>
            <Card className="overflow-hidden group transition-all duration-300 hover:shadow-lg hover:border-primary/30">
              <div className="relative h-64 w-full bg-muted overflow-hidden">
                {imageErrors[member.id] ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <span className="text-3xl font-bold text-primary">
                        {getInitials(member.name)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-contain sm:object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    onError={() => handleImageError(member.id)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{member.name}</CardTitle>
                <CardDescription className="text-sm font-medium">
                  {member.role[locale]}
                </CardDescription>
                <p className="text-sm text-muted-foreground pt-2">
                  {member.bio[locale]}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="secondary" className="font-normal">
                    {member.experience} {t("yearsExperience")}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold mb-2">
                      {t("specialties")}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {member.specialties[locale].map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="outline"
                          className="text-xs"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </RevealOnScroll>
        ))}
      </div>
    </SectionLayout>
  );
}
