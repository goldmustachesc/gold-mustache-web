# Design — Transactional Emails

## Overview

Introduzir canal de email transacional usando **Resend** como provedor e **React Email** como engine de templates. Envio é síncrono (fire-and-forget via `safeSend`) no caminho feliz; quando falha, a requisição é gravada em `EmailOutbox` e re-tentada por cron a cada minuto. Integração com `booking.ts` é via hooks após `createAppointment`, `cancelAppointment*` e `completeAppointment` (opcional escopo); chamadas não bloqueiam resposta HTTP.

## Decisão de Stack

### Provider: Resend (primário)

Escolhido sobre Postmark e SendGrid após comparação:

| Critério | Resend | Postmark | SendGrid |
|---|---|---|---|
| SDK TS/Node tipado | Excelente (first-class) | Bom (untyped) | Médio (legacy) |
| DX React Email | Nativo (mesmo time) | Manual | Manual |
| Deliverability pt-BR | Boa (IPs dedicados no free) | Excelente | Variável |
| Pricing free tier | 3k/mês, 100/dia | 100/mês | 100/dia (trial 60d) |
| Webhooks bounce/complaint | Sim (svix-signed) | Sim | Sim |
| Sandbox DX | `onboarding@resend.dev` pronto | Exige domínio | Exige domínio |

**Decisão**: Resend. DX superior com React Email + TS nativo, free tier cabe no volume atual, Postmark fica como fallback anotado no runbook caso deliverability degrade.

### Engine: React Email + `@react-email/render`

Permite escrever templates como componentes React (`.tsx`) com tokens do brand book, renderizando para HTML estático + plaintext automático. Encaixa-se no stack Next 15 + React 19 sem custo adicional.

## Arquitetura

```
┌──────────────────┐
│  booking.ts      │ createAppointment() / cancel*()
│  (hook point)    │
└────────┬─────────┘
         │ safeSend({ template, payload, idempotencyKey })
         ▼
┌──────────────────┐     hit    ┌─────────────────┐
│  sendEmail       ├──────────►│  Resend SDK     │
│  (wrapper)       │           │  (sdk.emails.send)│
└────────┬─────────┘            └─────────────────┘
         │ on failure / always (audit)
         ▼
┌──────────────────┐
│  EmailOutbox     │ status: PENDING→SENDING→SENT/FAILED
│  (Prisma model)  │
└────────┬─────────┘
         │ polled
         ▼
┌──────────────────┐
│ /api/cron/       │ retry with backoff
│  email-outbox    │
└──────────────────┘

┌──────────────────┐
│ /api/webhooks/   │ svix-signed → update EmailOutbox + EmailSuppression
│  resend          │
└──────────────────┘
```

## Estrutura de Arquivos

```
src/
├── emails/                         # React Email templates (.tsx)
│   ├── layouts/
│   │   └── EmailLayout.tsx         # header + footer + wrapper
│   ├── components/
│   │   ├── Button.tsx              # CTA branded
│   │   ├── AppointmentCard.tsx     # serviço/barbeiro/data reutilizável
│   │   └── Footer.tsx              # LGPD + unsubscribe
│   ├── templates/
│   │   ├── AppointmentConfirmation.tsx
│   │   ├── AppointmentCancellation.tsx
│   │   └── AppointmentReminder.tsx
│   └── index.ts                    # registry: template name → component + schema
│
├── services/email/
│   ├── sendEmail.ts                # wrapper tipado por template
│   ├── resend-client.ts            # singleton do SDK
│   ├── outbox.ts                   # enqueue / dequeue / markSent / markFailed
│   ├── preferences.ts              # getEmailPreferences, isOptedOut
│   ├── suppression.ts              # EmailSuppression helpers
│   ├── render.ts                   # renderTemplate(name, payload, locale)
│   └── __tests__/
│
├── app/api/
│   ├── cron/email-outbox/route.ts
│   ├── webhooks/resend/route.ts
│   └── account/email-preferences/[token]/route.ts
│
└── i18n/locales/{pt-BR,en,es}/emails.json
```

## Mudanças por Arquivo

### 1. Prisma Schema (`prisma/schema.prisma`)

```prisma
model GuestClient {
  // existing fields...
  email             String?   // NEW — optional guest email
  emailOptedOutAt   DateTime? @map("email_opted_out_at")
  locale            String?   // NEW — "pt-BR" | "en" | "es"
}

model Profile {
  // existing fields...
  emailPreferences  Json      @default("{\"confirmations\":true,\"cancellations\":true,\"reminders\":true,\"marketing\":false}") @map("email_preferences")
  locale            String?
}

model EmailOutbox {
  id               String   @id @default(uuid())
  template         String
  toEmail          String   @map("to_email")
  locale           String   @default("pt-BR")
  payload          Json
  idempotencyKey   String   @unique @map("idempotency_key")
  status           EmailOutboxStatus @default(PENDING)
  attempts         Int      @default(0)
  lastAttemptAt    DateTime? @map("last_attempt_at")
  nextAttemptAt    DateTime? @map("next_attempt_at")
  sentAt           DateTime? @map("sent_at")
  providerMessageId String? @map("provider_message_id")
  error            String?
  createdAt        DateTime @default(now()) @map("created_at")

  @@index([status, nextAttemptAt])
  @@index([toEmail])
  @@map("email_outbox")
}

enum EmailOutboxStatus {
  PENDING
  SENDING
  SENT
  FAILED
  SKIPPED_IDEMPOTENT
}

model EmailSuppression {
  id         String   @id @default(uuid())
  email      String   @unique
  reason     String   // "hard_bounce" | "complaint" | "manual"
  providerEventId String? @map("provider_event_id")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("email_suppression")
}
```

### 2. Feature Flag (`src/config/feature-flags.ts`)

Adicionar chave ao `FEATURE_FLAG_REGISTRY`:

```ts
transactionalEmails: {
  key: "transactionalEmails",
  description: "Envio de emails transacionais (confirmação, cancelamento, lembrete)",
  defaultValue: false,
  clientSafe: false,
  category: "notifications",
}
```

Gate obrigatório em `sendEmail`: se flag off, retorna `SKIPPED_DISABLED`.

### 3. `src/services/email/sendEmail.ts` — wrapper tipado

```ts
// Cada template define payload via Zod; wrapper aceita union discriminada
type SendArgs =
  | { template: "appointment-confirmation"; payload: AppointmentConfirmationPayload }
  | { template: "appointment-cancellation"; payload: AppointmentCancellationPayload }
  | { template: "appointment-reminder"; payload: AppointmentReminderPayload };

export async function sendEmail(args: SendArgs & {
  to: string;
  locale: SupportedLocale;
  idempotencyKey: string;
}): Promise<SendResult>;

// safeSend = non-throwing wrapper para uso em booking.ts
export async function safeSend(args: Parameters<typeof sendEmail>[0]): Promise<void>;
```

Fluxo de `sendEmail`:
1. Gate: flag `transactionalEmails` off → retorna `SKIPPED_DISABLED`.
2. Checa `EmailSuppression` → se match, `SKIPPED_SUPPRESSED`.
3. Checa `emailPreferences` da categoria correspondente → se opt-out, `SKIPPED_OPTED_OUT`.
4. Tenta INSERT em `EmailOutbox` com `idempotencyKey`; se unique violation → `SKIPPED_IDEMPOTENT`.
5. Renderiza template (`renderTemplate`) → HTML + plaintext.
6. Chama `resend.emails.send({...})`; em sucesso atualiza outbox `SENT` + `providerMessageId`.
7. Em erro → incrementa `attempts`, seta `nextAttemptAt` com backoff, mantém `PENDING` (cron re-tenta). Após 5 tentativas, `FAILED`.

### 4. Integração em `src/services/booking.ts`

Após cada mutation de sucesso, chamar `safeSend` **fora da transação Prisma** (evita segurar conexão durante I/O externo):

```ts
// createAppointment
await tx.$commit();
void safeSend({
  template: "appointment-confirmation",
  to: recipientEmail,
  locale: recipientLocale,
  idempotencyKey: `appointment-confirmation:${appointment.id}:created`,
  payload: { appointmentId: appointment.id },
});

// cancelAppointmentByClient / cancelAppointmentByBarber / cancelAppointmentByGuestToken
void safeSend({
  template: "appointment-cancellation",
  to: recipientEmail,
  locale: recipientLocale,
  idempotencyKey: `appointment-cancellation:${appointment.id}:${cancelledBy}`,
  payload: { appointmentId: appointment.id, cancelledBy, cancelReason },
});
```

`void` explícito sinaliza fire-and-forget; `safeSend` nunca throws.

### 5. Renderização de templates (`src/services/email/render.ts`)

```ts
export async function renderTemplate<T extends TemplateName>(
  name: T,
  payload: PayloadOf<T>,
  locale: SupportedLocale,
): Promise<{ subject: string; html: string; text: string }> {
  // 1. Busca dados agregados (appointment + service + barber + client)
  const data = await resolveTemplateData(name, payload);
  // 2. Carrega strings i18n de locales/{locale}/emails.json
  const messages = await loadEmailMessages(locale);
  // 3. Renderiza componente via @react-email/render
  const Component = TEMPLATE_REGISTRY[name];
  const html = await render(<Component data={data} messages={messages} locale={locale} />);
  const text = await render(<Component ... />, { plainText: true });
  return { subject: messages[name].subject(data), html, text };
}
```

### 6. Cron outbox (`src/app/api/cron/email-outbox/route.ts`)

- Header: `Authorization: Bearer ${CRON_SECRET}` (já usado em outros crons do repo).
- Busca `EmailOutbox` onde `status=PENDING` AND `nextAttemptAt <= now()`, limite 50.
- Para cada: tenta enviar; atualiza status.
- Schedule: `vercel.json` → `*/1 * * * *` (a cada minuto).

### 7. Webhook Resend (`src/app/api/webhooks/resend/route.ts`)

- Valida `svix-signature` header com `RESEND_WEBHOOK_SECRET`.
- Types: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`.
- Atualiza `EmailOutbox` pelo `providerMessageId`.
- Hard bounce / complaint → insert em `EmailSuppression`.

## Variáveis de Ambiente

Adicionar em `docs/environment-variables.md` e `.env.example`:

```
RESEND_API_KEY=re_xxx                      # server-only, secret
RESEND_WEBHOOK_SECRET=whsec_xxx            # server-only
EMAIL_FROM="Gold Mustache <contato@goldmustachebarbearia.com.br>"
EMAIL_REPLY_TO=contato@goldmustachebarbearia.com.br
EMAIL_UNSUBSCRIBE_SECRET=xxx               # HMAC para tokens de descadastro
FEATURE_FLAG_TRANSACTIONAL_EMAILS=false    # padrão off, liga por ambiente
```

**Sem domínio próprio no primeiro rollout**: usar `onboarding@resend.dev` em dev; em prod configurar DNS de `goldmustachebarbearia.com.br` (SPF + DKIM + DMARC) antes de ligar flag.

## Testes

- **Unit (Vitest)**: `sendEmail` com Resend mockado — gates, idempotência, retry, opt-out, suppression.
- **Snapshot HTML**: `renderTemplate` → snapshot do HTML renderizado por template × locale (9 snapshots).
- **Integration**: simular `createAppointment` + verificar que `safeSend` foi chamado com idempotencyKey correto.
- **Webhook**: fixtures de payload Resend, valida parsing + side-effects.
- **E2E (Resend sandbox)**: script manual `scripts/send-test-email.ts` que usa sandbox key para validar em staging.

## Segurança

- API key nunca exposta ao cliente (checar com teste que `process.env.RESEND_API_KEY` não vaza em bundles).
- Webhook valida assinatura.
- Token de descadastro é HMAC(`userId`, `EMAIL_UNSUBSCRIBE_SECRET`), TTL de 1 ano, single-use opcional.
- Payload do outbox não contém senhas/tokens — só IDs resolvidos no render.
- Rate limit em `/api/account/email-preferences/*` para impedir enumeração.

## Decisões e Tradeoffs

- **Fire-and-forget + outbox fallback** em vez de fila dedicada (BullMQ/Upstash QStash) porque: simplicidade, Vercel não tem worker longo-vivo, volume baixo (< 50k/mês) cabe num cron minutário. Se volume crescer, migrar para QStash é refactor isolado dentro de `outbox.ts`.
- **Guest email opcional** (não obrigatório) para não atritar conversão do booking público; WhatsApp permanece como canal primário para guest.
- **Opt-out LGPD-first**: todo email com link de descadastro, mesmo os transacionais.
- **No queue dedicada no primeiro rollout**: avaliar após 3 meses de métricas.

## Matriz de Rastreabilidade

| Requisito | Arquivo principal | Testes |
|---|---|---|
| R1 Confirmação | `booking.ts` (hook) + `templates/AppointmentConfirmation.tsx` | `sendEmail.test.ts`, `booking.integration.test.ts` |
| R2 Cancelamento | `booking.ts` (3 hooks) + `templates/AppointmentCancellation.tsx` | idem |
| R3 Lembrete (template) | `templates/AppointmentReminder.tsx` | snapshot + unit |
| R4 Brand | `layouts/EmailLayout.tsx`, `components/*` | snapshot visual + litmus manual |
| R5 i18n | `render.ts` + `emails.json` × 3 | snapshot por locale |
| R6 Outbox/retry | `outbox.ts` + `cron/email-outbox/route.ts` | unit + cron route test |
| R7 Opt-out | `preferences.ts` + `/account/email-preferences` | unit + e2e |
| R8 LGPD | `Footer.tsx` + `/api/account/email-history` | snapshot + unit |
| R9 Captura guest | Prisma migration + form de booking | migration + schema test |
| R10 Bounce/spam | `webhooks/resend/route.ts` + `suppression.ts` | unit com fixtures |
