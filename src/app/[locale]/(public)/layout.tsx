import { FloatingBookingButton } from "@/components/ui/floating-booking-button";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PUBLIC_NS } from "@/i18n/namespace-groups";
import { pickMessages } from "@/i18n/pick-messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={pickMessages(messages, PUBLIC_NS)}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingBookingButton />
      </div>
    </NextIntlClientProvider>
  );
}
