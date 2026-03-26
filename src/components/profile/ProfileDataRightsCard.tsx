import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Download, ShieldCheck, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

export function ProfileDataRightsCard() {
  const t = useTranslations("profile.dataRights");

  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <CardHeader className="gap-3 border-b border-border bg-muted/35">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-3 w-3" />
              {t("badge")}
            </Badge>
            <div className="space-y-1">
              <CardTitle className="text-base">{t("title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 py-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("includes.accountTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("includes.accountDescription")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-background/70 p-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("includes.appointmentsTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("includes.appointmentsDescription")}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {t("exportTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{t("exportBody")}</p>
          </div>

          <Button asChild className="w-full sm:w-auto">
            <a href="/api/profile/export" download>
              <Download className="h-4 w-4" />
              {t("exportButton")}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
