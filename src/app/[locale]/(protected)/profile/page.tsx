"use client";

import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";
import { EmailVerificationCard } from "@/components/profile/EmailVerificationCard";
import { ProfileActionCard } from "@/components/profile/ProfileActionCard";
import { ProfileDataRightsCard } from "@/components/profile/ProfileDataRightsCard";
import { useUser } from "@/hooks/useAuth";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileSectionHeading } from "@/components/profile/ProfileSectionHeading";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useProfileMe } from "@/hooks/useProfileMe";
import type { ProfileMeData } from "@/types/profile";
import { formatLocalizedDateFromIsoDateLike } from "@/utils/datetime";
import { maskPhone } from "@/utils/masks";
import {
  AlertTriangle,
  Calendar,
  Clock3,
  Download,
  Loader2,
  Mail,
  Phone,
  Scissors,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBookingSettings } from "@/providers/booking-settings-provider";

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const REQUIRED_ADDRESS_FIELDS = [
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
  "zipCode",
] as const;

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAddress(profile: ProfileMeData | undefined): boolean {
  return REQUIRED_ADDRESS_FIELDS.every((field) => hasValue(profile?.[field]));
}

function getRoleLabel({
  isBarber,
  role,
  t,
}: {
  isBarber: boolean;
  role: ProfileMeData["role"] | undefined;
  t: (key: string) => string;
}): string {
  if (role === "ADMIN") {
    return t("hero.adminRole");
  }

  if (isBarber || role === "BARBER") {
    return t("hero.barberRole");
  }

  return t("hero.customerRole");
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const params = useParams();
  const locale = params.locale as string;
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();
  const { data: dashboardStats, isLoading: dashboardLoading } =
    useDashboardStats();
  const { bookingHref, shouldShowBooking, isExternal, isInternal } =
    useBookingSettings();

  const isLoading = userLoading || profileLoading || barberLoading;
  const isBarber = !!barberProfile;
  const nextAppointment = dashboardStats?.client?.nextAppointment ?? null;
  const hasCompleteAddress = hasAddress(profile);
  const pendingItems = [
    !profile?.emailVerified ? t("hero.pendingVerification") : null,
    !profile?.phone ? t("hero.pendingPhone") : null,
    !hasCompleteAddress ? t("hero.pendingAddress") : null,
  ].filter((item): item is string => Boolean(item));
  const completionChecks = [
    Boolean(profile?.fullName),
    Boolean(profile?.phone),
    hasCompleteAddress,
    Boolean(profile?.emailVerified),
  ];
  const completion =
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100;
  const displayName = profile?.fullName || t("hero.noName");
  const displayPhone = profile?.phone
    ? maskPhone(profile.phone)
    : t("hero.noPhone");
  const roleLabel = getRoleLabel({ isBarber, role: profile?.role, t });

  usePrivateHeader({ title: t("title"), icon: User });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">{t("loading")}</span>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
            {t("title")}
          </p>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Card className="overflow-hidden border-border bg-card shadow-none">
          <div className="grid lg:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6 p-6 lg:p-8">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.35em] text-primary">
                  {t("hero.eyebrow")}
                </p>
                <div className="space-y-2">
                  <h1 className="font-playfair text-3xl font-bold tracking-tight text-foreground lg:text-5xl">
                    {displayName}
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground">
                    {t("hero.description")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={profile?.emailVerified ? "success" : "warning"}>
                  {profile?.emailVerified
                    ? t("hero.verified")
                    : t("hero.pending")}
                </Badge>
                <Badge variant="secondary">{roleLabel}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/35 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {t("personalInfo.email")}
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-foreground">
                    {user?.email}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/35 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {t("personalInfo.phone")}
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {displayPhone}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/35 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    {t("hero.completionLabel")}
                  </p>
                  <p className="mt-2 font-playfair text-3xl font-bold text-foreground">
                    {completion.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-secondary p-6 text-secondary-foreground lg:border-t-0 lg:border-l lg:p-8">
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">
                      {t("hero.nextAppointment")}
                    </p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>

                  {nextAppointment ? (
                    <div className="space-y-4 rounded-2xl border border-primary/20 bg-background/5 p-4">
                      <div className="space-y-1">
                        <p className="text-sm text-secondary-foreground/70">
                          {t("appointment.service")}
                        </p>
                        <p className="font-playfair text-2xl font-bold">
                          {nextAppointment.service.name}
                        </p>
                        <p className="text-sm text-secondary-foreground/75">
                          {nextAppointment.service.duration} min ·{" "}
                          {formatCurrency(
                            nextAppointment.service.price,
                            locale,
                          )}
                        </p>
                      </div>

                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2 text-secondary-foreground/65">
                            <Calendar className="h-4 w-4 text-primary" />
                            {t("appointment.date")}
                          </div>
                          <p className="font-medium text-secondary-foreground">
                            {formatLocalizedDateFromIsoDateLike(
                              nextAppointment.date,
                              locale,
                              {
                                day: "2-digit",
                                month: "long",
                                weekday: "short",
                              },
                            )}
                          </p>
                        </div>

                        <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2 text-secondary-foreground/65">
                            <Clock3 className="h-4 w-4 text-primary" />
                            {t("appointment.time")}
                          </div>
                          <p className="font-medium text-secondary-foreground">
                            {nextAppointment.startTime} -{" "}
                            {nextAppointment.endTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-secondary-foreground/80">
                        <Scissors className="h-4 w-4 text-primary" />
                        <span>
                          {t("appointment.barber")}:{" "}
                          {nextAppointment.barber.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-secondary-foreground/75">
                        {dashboardLoading
                          ? t("hero.loadingAppointment")
                          : t("hero.noUpcoming")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-secondary-foreground">
                    {t("hero.pendingTitle")}
                  </p>
                  {pendingItems.length > 0 ? (
                    <div className="space-y-2">
                      {pendingItems.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-secondary-foreground/80"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-primary/15 bg-primary/10 px-3 py-2 text-sm text-primary">
                      {t("hero.pendingNone")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-playfair text-2xl font-bold text-foreground">
            {t("quickActions.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("quickActions.description")}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {shouldShowBooking && bookingHref ? (
            <ProfileActionCard
              href={bookingHref}
              icon={Calendar}
              label={t("quickActions.bookingLabel")}
              description={t("quickActions.bookingDescription")}
              variant="primary"
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
            />
          ) : null}

          {isInternal ? (
            <ProfileActionCard
              href={`/${locale}/meus-agendamentos`}
              icon={Sparkles}
              label={t("quickActions.appointmentsLabel")}
              description={t("quickActions.appointmentsDescription")}
            />
          ) : null}

          <ProfileActionCard
            href="/api/profile/export"
            icon={Download}
            label={t("quickActions.exportLabel")}
            description={t("quickActions.exportDescription")}
            download
          />

          <ProfileActionCard
            href="#account-security"
            icon={Shield}
            label={t("quickActions.securityLabel")}
            description={t("quickActions.securityDescription")}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-7">
          <section className="space-y-6">
            <ProfileSectionHeading
              icon={User}
              title={t("sections.personal.title")}
              description={t("sections.personal.description")}
            />
            <ProfileForm profile={profile} userEmail={user?.email} />
          </section>
        </div>

        <div className="space-y-8 xl:col-span-5">
          <section id="account-security" className="space-y-6">
            <ProfileSectionHeading
              icon={Shield}
              title={t("sections.security.title")}
              description={t("sections.security.description")}
            />
            <div className="space-y-4">
              <EmailVerificationCard
                email={user?.email}
                isVerified={profile?.emailVerified ?? false}
              />
              <PasswordChangeCard />
            </div>
          </section>

          <section className="space-y-6">
            <ProfileSectionHeading
              icon={ShieldCheck}
              title={t("sections.privacy.title")}
              description={t("sections.privacy.description")}
            />
            <ProfileDataRightsCard />
          </section>

          <section className="space-y-6">
            <ProfileSectionHeading
              icon={AlertTriangle}
              title={t("sections.danger.title")}
              description={t("sections.danger.description")}
            />
            <DeleteAccountCard />
          </section>
        </div>
      </div>
    </main>
  );
}
