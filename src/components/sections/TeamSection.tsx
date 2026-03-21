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
import { defaultLocale, isValidLocale, type Locale } from "@/i18n/config";
import { Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { TeamMemberImage } from "./TeamMemberImage";

export async function TeamSection() {
  const rawLocale = await getLocale();
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const t = await getTranslations({ locale, namespace: "team" });

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
                <TeamMemberImage
                  src={member.image}
                  alt={member.name}
                  name={member.name}
                />
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
