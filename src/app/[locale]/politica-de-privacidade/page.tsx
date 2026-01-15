import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { BRAND } from "@/constants/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: siteConfig.isProduction,
      follow: siteConfig.isProduction,
    },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  const lastUpdated = "05 de Janeiro de 2026";

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <article className="space-y-8">
          {/* Header */}
          <header className="border-b border-border pb-6">
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("lastUpdated")}: {lastUpdated}
            </p>
          </header>

          {/* Introdução */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.intro.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.intro.content")}
            </p>
          </section>

          {/* Controlador dos Dados */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.controller.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.controller.content")}
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  {t("sections.controller.companyName")}:
                </strong>{" "}
                {BRAND.name}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.controller.address")}:
                </strong>{" "}
                {BRAND.contact.address}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.controller.email")}:
                </strong>{" "}
                {BRAND.contact.email}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.controller.phone")}:
                </strong>{" "}
                {BRAND.contact.phone}
              </li>
            </ul>
          </section>

          {/* Dados Coletados */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.dataCollected.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.dataCollected.intro")}
            </p>

            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <h3 className="text-lg font-medium text-foreground">
                {t("sections.dataCollected.registration.title")}
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>{t("sections.dataCollected.registration.name")}</li>
                <li>{t("sections.dataCollected.registration.email")}</li>
                <li>{t("sections.dataCollected.registration.phone")}</li>
                <li>{t("sections.dataCollected.registration.address")}</li>
              </ul>
            </div>

            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <h3 className="text-lg font-medium text-foreground">
                {t("sections.dataCollected.booking.title")}
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>{t("sections.dataCollected.booking.appointments")}</li>
                <li>{t("sections.dataCollected.booking.preferences")}</li>
              </ul>
            </div>

            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <h3 className="text-lg font-medium text-foreground">
                {t("sections.dataCollected.analytics.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.dataCollected.analytics.content")}
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>{t("sections.dataCollected.analytics.ip")}</li>
                <li>{t("sections.dataCollected.analytics.browser")}</li>
                <li>{t("sections.dataCollected.analytics.pages")}</li>
                <li>{t("sections.dataCollected.analytics.device")}</li>
              </ul>
            </div>
          </section>

          {/* Finalidades */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.purposes.title")}
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("sections.purposes.booking")}</li>
              <li>{t("sections.purposes.communication")}</li>
              <li>{t("sections.purposes.improvement")}</li>
              <li>{t("sections.purposes.legal")}</li>
            </ul>
          </section>

          {/* Base Legal */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.legalBasis.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.legalBasis.intro")}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  {t("sections.legalBasis.consent.title")}:
                </strong>{" "}
                {t("sections.legalBasis.consent.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.legalBasis.contract.title")}:
                </strong>{" "}
                {t("sections.legalBasis.contract.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.legalBasis.legitimate.title")}:
                </strong>{" "}
                {t("sections.legalBasis.legitimate.content")}
              </li>
            </ul>
          </section>

          {/* Compartilhamento */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.sharing.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.sharing.intro")}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Supabase:</strong>{" "}
                {t("sections.sharing.supabase")}
              </li>
              <li>
                <strong className="text-foreground">Google Analytics:</strong>{" "}
                {t("sections.sharing.analytics")}
              </li>
              <li>
                <strong className="text-foreground">Vercel:</strong>{" "}
                {t("sections.sharing.vercel")}
              </li>
            </ul>
          </section>

          {/* Retenção */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.retention.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.retention.content")}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("sections.retention.account")}</li>
              <li>{t("sections.retention.appointments")}</li>
              <li>{t("sections.retention.analytics")}</li>
            </ul>
          </section>

          {/* Direitos do Titular */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.rights.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.rights.intro")}
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  {t("sections.rights.access.title")}:
                </strong>{" "}
                {t("sections.rights.access.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.rights.correction.title")}:
                </strong>{" "}
                {t("sections.rights.correction.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.rights.deletion.title")}:
                </strong>{" "}
                {t("sections.rights.deletion.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.rights.portability.title")}:
                </strong>{" "}
                {t("sections.rights.portability.content")}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.rights.revocation.title")}:
                </strong>{" "}
                {t("sections.rights.revocation.content")}
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              {t("sections.rights.howTo")}
            </p>
          </section>

          {/* Cookies */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.cookies.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.cookies.intro")}
            </p>

            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <h3 className="text-lg font-medium text-foreground">
                {t("sections.cookies.essential.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.cookies.essential.content")}
              </p>
            </div>

            <div className="space-y-3 pl-4 border-l-2 border-primary/30">
              <h3 className="text-lg font-medium text-foreground">
                {t("sections.cookies.analytics.title")}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t("sections.cookies.analytics.content")}
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {t("sections.cookies.management")}
            </p>
          </section>

          {/* Segurança */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.security.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.security.content")}
            </p>
          </section>

          {/* Alterações */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.changes.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.changes.content")}
            </p>
          </section>

          {/* Contato / DPO */}
          <section className="space-y-3 pb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {t("sections.contact.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("sections.contact.content")}
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                <strong className="text-foreground">Email:</strong>{" "}
                {BRAND.contact.email}
              </li>
              <li>
                <strong className="text-foreground">WhatsApp:</strong>{" "}
                {BRAND.contact.whatsapp}
              </li>
              <li>
                <strong className="text-foreground">
                  {t("sections.contact.address")}:
                </strong>{" "}
                {BRAND.contact.address}
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
