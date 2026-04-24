import type { Messages } from "next-intl";

export function pickMessages(
  messages: Messages,
  namespaces: readonly string[],
): Partial<Messages> {
  const picked: Record<string, unknown> = {};
  for (const ns of namespaces) {
    if (ns in messages) {
      picked[ns] = messages[ns as keyof Messages];
    }
  }
  return picked as Partial<Messages>;
}
