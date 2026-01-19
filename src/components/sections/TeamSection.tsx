"use client";

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageError = (memberId: string) => {
    setImageErrors((prev) => ({ ...prev, [memberId]: true }));
  };

  return (
    <section className="py-20 bg-muted/30" id="equipe">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Users className="h-4 w-4 mr-2" />
            <span>{t("badge")}</span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member) => (
            <Card
              key={member.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-64 w-full bg-muted">
                {imageErrors[member.id] ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <span className="text-3xl font-bold text-primary">
                          {getInitials(member.name)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-contain sm:object-cover object-top"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={() => handleImageError(member.id)}
                  />
                )}
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
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="font-normal">
                      {member.experience} {t("yearsExperience")}
                    </Badge>
                  </div>
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
          ))}
        </div>
      </div>
    </section>
  );
}
