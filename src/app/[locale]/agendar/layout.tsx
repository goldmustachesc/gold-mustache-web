import { BOOKING_NS } from "@/i18n/namespace-groups";
import { pickMessages } from "@/i18n/pick-messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AgendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={pickMessages(messages, BOOKING_NS)}>
      {children}
    </NextIntlClientProvider>
  );
}
