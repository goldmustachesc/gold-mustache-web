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
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("lastUpdated")}: {lastUpdated}
        </p>

        {/* Introdução */}
        <section className="mt-8">
          <h2>{t("sections.intro.title")}</h2>
          <p>{t("sections.intro.content")}</p>
        </section>

        {/* Controlador dos Dados */}
        <section className="mt-8">
          <h2>{t("sections.controller.title")}</h2>
          <p>{t("sections.controller.content")}</p>
          <ul>
            <li>
              <strong>{t("sections.controller.companyName")}:</strong>{" "}
              {BRAND.name}
            </li>
            <li>
              <strong>{t("sections.controller.address")}:</strong>{" "}
              {BRAND.contact.address}
            </li>
            <li>
              <strong>{t("sections.controller.email")}:</strong>{" "}
              {BRAND.contact.email}
            </li>
            <li>
              <strong>{t("sections.controller.phone")}:</strong>{" "}
              {BRAND.contact.phone}
            </li>
          </ul>
        </section>

        {/* Dados Coletados */}
        <section className="mt-8">
          <h2>{t("sections.dataCollected.title")}</h2>
          <p>{t("sections.dataCollected.intro")}</p>

          <h3>{t("sections.dataCollected.registration.title")}</h3>
          <ul>
            <li>{t("sections.dataCollected.registration.name")}</li>
            <li>{t("sections.dataCollected.registration.email")}</li>
            <li>{t("sections.dataCollected.registration.phone")}</li>
            <li>{t("sections.dataCollected.registration.address")}</li>
          </ul>

          <h3>{t("sections.dataCollected.booking.title")}</h3>
          <ul>
            <li>{t("sections.dataCollected.booking.appointments")}</li>
            <li>{t("sections.dataCollected.booking.preferences")}</li>
          </ul>

          <h3>{t("sections.dataCollected.analytics.title")}</h3>
          <p>{t("sections.dataCollected.analytics.content")}</p>
          <ul>
            <li>{t("sections.dataCollected.analytics.ip")}</li>
            <li>{t("sections.dataCollected.analytics.browser")}</li>
            <li>{t("sections.dataCollected.analytics.pages")}</li>
            <li>{t("sections.dataCollected.analytics.device")}</li>
          </ul>
        </section>

        {/* Finalidades */}
        <section className="mt-8">
          <h2>{t("sections.purposes.title")}</h2>
          <ul>
            <li>{t("sections.purposes.booking")}</li>
            <li>{t("sections.purposes.communication")}</li>
            <li>{t("sections.purposes.improvement")}</li>
            <li>{t("sections.purposes.legal")}</li>
          </ul>
        </section>

        {/* Base Legal */}
        <section className="mt-8">
          <h2>{t("sections.legalBasis.title")}</h2>
          <p>{t("sections.legalBasis.intro")}</p>
          <ul>
            <li>
              <strong>{t("sections.legalBasis.consent.title")}:</strong>{" "}
              {t("sections.legalBasis.consent.content")}
            </li>
            <li>
              <strong>{t("sections.legalBasis.contract.title")}:</strong>{" "}
              {t("sections.legalBasis.contract.content")}
            </li>
            <li>
              <strong>{t("sections.legalBasis.legitimate.title")}:</strong>{" "}
              {t("sections.legalBasis.legitimate.content")}
            </li>
          </ul>
        </section>

        {/* Compartilhamento */}
        <section className="mt-8">
          <h2>{t("sections.sharing.title")}</h2>
          <p>{t("sections.sharing.intro")}</p>
          <ul>
            <li>
              <strong>Supabase:</strong> {t("sections.sharing.supabase")}
            </li>
            <li>
              <strong>Google Analytics:</strong>{" "}
              {t("sections.sharing.analytics")}
            </li>
            <li>
              <strong>Vercel:</strong> {t("sections.sharing.vercel")}
            </li>
          </ul>
        </section>

        {/* Retenção */}
        <section className="mt-8">
          <h2>{t("sections.retention.title")}</h2>
          <p>{t("sections.retention.content")}</p>
          <ul>
            <li>{t("sections.retention.account")}</li>
            <li>{t("sections.retention.appointments")}</li>
            <li>{t("sections.retention.analytics")}</li>
          </ul>
        </section>

        {/* Direitos do Titular */}
        <section className="mt-8">
          <h2>{t("sections.rights.title")}</h2>
          <p>{t("sections.rights.intro")}</p>
          <ul>
            <li>
              <strong>{t("sections.rights.access.title")}:</strong>{" "}
              {t("sections.rights.access.content")}
            </li>
            <li>
              <strong>{t("sections.rights.correction.title")}:</strong>{" "}
              {t("sections.rights.correction.content")}
            </li>
            <li>
              <strong>{t("sections.rights.deletion.title")}:</strong>{" "}
              {t("sections.rights.deletion.content")}
            </li>
            <li>
              <strong>{t("sections.rights.portability.title")}:</strong>{" "}
              {t("sections.rights.portability.content")}
            </li>
            <li>
              <strong>{t("sections.rights.revocation.title")}:</strong>{" "}
              {t("sections.rights.revocation.content")}
            </li>
          </ul>
          <p className="mt-4">{t("sections.rights.howTo")}</p>
        </section>

        {/* Cookies */}
        <section className="mt-8">
          <h2>{t("sections.cookies.title")}</h2>
          <p>{t("sections.cookies.intro")}</p>

          <h3>{t("sections.cookies.essential.title")}</h3>
          <p>{t("sections.cookies.essential.content")}</p>

          <h3>{t("sections.cookies.analytics.title")}</h3>
          <p>{t("sections.cookies.analytics.content")}</p>

          <p className="mt-4">{t("sections.cookies.management")}</p>
        </section>

        {/* Segurança */}
        <section className="mt-8">
          <h2>{t("sections.security.title")}</h2>
          <p>{t("sections.security.content")}</p>
        </section>

        {/* Alterações */}
        <section className="mt-8">
          <h2>{t("sections.changes.title")}</h2>
          <p>{t("sections.changes.content")}</p>
        </section>

        {/* Contato / DPO */}
        <section className="mt-8">
          <h2>{t("sections.contact.title")}</h2>
          <p>{t("sections.contact.content")}</p>
          <ul>
            <li>
              <strong>Email:</strong> {BRAND.contact.email}
            </li>
            <li>
              <strong>WhatsApp:</strong> {BRAND.contact.whatsapp}
            </li>
            <li>
              <strong>{t("sections.contact.address")}:</strong>{" "}
              {BRAND.contact.address}
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
