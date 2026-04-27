# Design — appointment-reminders-cron

## Arquitetura de Alto Nível

```
Vercel Cron (*/15 * * * *)
        │
        ▼
POST /api/cron/appointment-reminders        ← Bearer CRON_SECRET
        │
        ▼
ReminderCronController
  ├─ valida auth + origem
  ├─ checa feature flag `appointmentReminders`
  ├─ adquire advisory lock pg (try)
  ├─ chama reminderService.processReminderBatch()
  └─ retorna {sent, failed, skipped, executionId}
        │
        ▼
src/services/reminders/
  ├─ reminder.service.ts        → processReminderBatch(), findEligibleAppointments()
  ├─ reminder.dispatcher.ts     → dispatchEmail(), dispatchWhatsapp()
  ├─ reminder.window.ts         → computeReminderWindow(now, tz)
  ├─ reminder.lock.ts           → withAdvisoryLock()
  └─ types.ts                   → ReminderJob, ReminderResult, ReminderChannel
        │
        ├─────► transactional-emails/sendTemplate('appointment-reminder', payload)
        └─────► WhatsApp module (deep-link MVP / business-api futuro)
```

## Componentes

### 1. Endpoint `POST /api/cron/appointment-reminders`

Arquivo novo: `src/app/api/cron/appointment-reminders/route.ts`.

Responsabilidades:

- Validar `Authorization: Bearer ${process.env.CRON_SECRET}`
- Ler feature flag `appointmentReminders` via `src/services/feature-flags.ts`
- Chamar `processReminderBatch()` com `executionId` gerado (`crypto.randomUUID()`)
- Responder 200 com resumo ou 401/500 em falha de auth/config

Mesmo contrato de auth já utilizado em `src/app/api/cron/sync-instagram/route.ts`.

### 2. Serviço `src/services/reminders/reminder.service.ts`

Função principal:

```ts
type ProcessReminderBatchInput = {
  executionId: string;
  now?: Date;                  // injetável para testes determinísticos
  timezone?: string;           // default "America/Sao_Paulo"
  chunkSize?: number;          // default 10
};

type ProcessReminderBatchResult = {
  executionId: string;
  eligibleCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
};

async function processReminderBatch(
  input: ProcessReminderBatchInput
): Promise<ProcessReminderBatchResult>;
```

Fluxo interno:

1. Calcula janela `[now+23h, now+25h]` em `America/Sao_Paulo` (ver `reminder.window.ts`)
2. Busca candidatos via `findEligibleAppointments(window)`
3. Para cada agendamento em chunks:
   - Usa `prisma.$transaction` com `UPDATE appointment SET reminder_sent_at = NOW() WHERE id = $1 AND reminder_sent_at IS NULL RETURNING id`
   - SE update retornou 0 linhas, considera `skipped` (outro worker marcou primeiro)
   - SE update retornou 1 linha, dispara `dispatchEmail()` (e opcional `dispatchWhatsapp()`)
   - SE envio falhar, faz `UPDATE ... SET reminder_sent_at = NULL` (rollback lógico) e conta como `failed`
4. Retorna agregado

Racional do double-check (`reminder_sent_at IS NULL` no UPDATE): combinado com advisory lock, previne duplicidade mesmo se duas crons passarem do lock (defesa em profundidade).

### 3. Janela temporal — `src/services/reminders/reminder.window.ts`

```ts
type ReminderWindow = { startUtc: Date; endUtc: Date };

function computeReminderWindow(
  now: Date,
  timezone: string = "America/Sao_Paulo"
): ReminderWindow;
```

- Converte `now` para zoned time
- Retorna `startUtc = now + 23h`, `endUtc = now + 25h` (ambos em UTC)
- Usa `date-fns-tz` (já no stack do projeto) ou implementação nativa `Intl.DateTimeFormat`

Função auxiliar para casar com schema:

```ts
function appointmentStartsAtUtc(
  date: Date,       // Appointment.date (DATE, meia-noite UTC)
  startTime: string, // "HH:mm"
  timezone: string
): Date;
```

### 4. Advisory Lock — `src/services/reminders/reminder.lock.ts`

```ts
async function withAdvisoryLock<T>(
  lockKey: bigint,
  fn: () => Promise<T>
): Promise<{ acquired: true; result: T } | { acquired: false }>;
```

- Usa `SELECT pg_try_advisory_lock($1)` / `SELECT pg_advisory_unlock($1)` via `prisma.$queryRaw`
- `lockKey` derivada de hash estável de `"appointment-reminders-cron"` (ex: `BigInt("0x" + sha256(name).slice(0,15))`)
- Garante `unlock` em `finally`

### 5. Dispatcher — `src/services/reminders/reminder.dispatcher.ts`

```ts
type EmailDispatchInput = {
  to: string;
  clientName: string;
  serviceName: string;
  barberName: string;
  dateFormatted: string;
  timeFormatted: string;
};

async function dispatchEmail(input: EmailDispatchInput): Promise<void>;
```

- Delegado para o módulo da spec `transactional-emails` (contrato acordado: `sendTemplate("appointment-reminder", payload)`)
- Retry com backoff: `[500ms, 2s, 5s]`
- Lança erro classificado (`TransientError` vs `PermanentError`)

WhatsApp deep-link (MVP):

```ts
async function dispatchWhatsappDeepLink(
  barberUserId: string,
  input: { phone: string; message: string }
): Promise<void>;
```

- Cria `Notification` para o barbeiro com `type = APPOINTMENT_REMINDER` e `data = { whatsappUrl, appointmentId, channel: 'whatsapp-deeplink' }`
- Barbeiro clica no link no app → WhatsApp Web/App abre

### 6. Schema — Migration Prisma

Adicionar em `prisma/schema.prisma`:

```prisma
model Appointment {
  // ...campos existentes
  reminderSentAt DateTime? @map("reminder_sent_at")

  @@index([status, date, reminderSentAt])
}
```

Migration SQL (gerada por `prisma migrate dev`):

```sql
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMP(3);
CREATE INDEX appointments_status_date_reminder_sent_at_idx
  ON appointments(status, date, reminder_sent_at);
```

Índice composto otimiza a query `WHERE status = 'CONFIRMED' AND date BETWEEN ... AND reminder_sent_at IS NULL`.

### 7. Feature Flags

Seed (`prisma/seed.ts` ou migration de dados):

| key                             | enabled | description                                                 |
| ------------------------------- | ------- | ----------------------------------------------------------- |
| `appointmentReminders`          | `false` | Ativa cron de lembretes automáticos 24h antes               |
| `appointmentRemindersWhatsapp`  | `false` | Ativa canal WhatsApp (deep link) complementar ao email      |

Leitura via `src/services/feature-flags.ts` (já existente).

### 8. Vercel Cron — `vercel.json`

Adicionar entrada:

```json
{
  "crons": [
    { "path": "/api/cron/sync-instagram", "schedule": "0 10 * * *" },
    { "path": "/api/cron/appointment-reminders", "schedule": "*/15 * * * *" }
  ]
}
```

Vercel Cron chama com `GET` por padrão mas suporta `POST` — manter consistência com `sync-instagram` (que usa `POST`).

### 9. Tipos e Contratos — `src/services/reminders/types.ts`

```ts
export type ReminderChannel = "email" | "whatsapp-deeplink" | "whatsapp-api";

export type ReminderJob = {
  appointmentId: string;
  clientKind: "registered" | "guest";
  email: string | null;
  phone: string | null;
  clientName: string;
  serviceName: string;
  barberName: string;
  barberUserId: string;
  startsAtUtc: Date;
  dateFormatted: string;
  timeFormatted: string;
};

export type ReminderDispatchOutcome =
  | { status: "sent"; channels: ReminderChannel[] }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: "already_sent" | "no_contact" | "opt_out" };
```

## Modelo de Falhas

| Falha                          | Comportamento                                           |
| ------------------------------ | ------------------------------------------------------- |
| DB indisponível                | 500 no endpoint, cron re-tenta na próxima janela        |
| Provider email 5xx/timeout     | Retry 3x; persiste falha → rollback `reminderSentAt`    |
| Provider email 4xx permanente  | Marca `failed`, NÃO retry; log com motivo               |
| Lock não adquirido             | 200 + `skipped: true`                                   |
| Flag desabilitada              | 200 + `skipped: true, reason: 'flag_disabled'`          |
| Agendamento cancelado durante envio | Query refaz filtro status=CONFIRMED no UPDATE     |

## Decisões de Design

### D1 — Cron a cada 15 minutos

Janela de 2h `[23h, 25h]` + frequência 15 min = até 8 oportunidades de envio por agendamento, absorvendo falhas transitórias sem duplicar (idempotência garantida por `reminderSentAt`).

### D2 — Idempotência em dupla camada

- **Camada 1**: advisory lock evita execuções concorrentes
- **Camada 2**: `UPDATE ... WHERE reminder_sent_at IS NULL` em transação atômica funciona como guard mesmo se lock falhar

### D3 — Email primeiro, WhatsApp complementar

WhatsApp sem API oficial não tem confirmação de entrega — não pode ser fonte de verdade. Email é o canal primário; WhatsApp é best-effort via deep link para barbeiro ou API futura.

### D4 — Sem queue externa no MVP

Volume esperado (< 50 lembretes/dia em produção pequena) é absorvido por execução síncrona com `chunkSize=10` e `Promise.allSettled`. Migrar para BullMQ/Inngest só se volume justificar.

### D5 — Guest clients via WhatsApp deep link apenas

Guest clients não têm email. Manter comportamento atual (notificar barbeiro para enviar WhatsApp) como fallback até criarmos fluxo de coleta de email opcional no booking guest.

## Traceability Matrix

| Req   | Componente                                                      |
| ----- | --------------------------------------------------------------- |
| 1     | `vercel.json`, route `/api/cron/appointment-reminders`          |
| 2     | `reminder.service.findEligibleAppointments`, `reminder.window`  |
| 3     | `reminder.dispatcher.dispatchEmail` + spec `transactional-emails` |
| 4     | `reminder.dispatcher.dispatchWhatsappDeepLink`, flag            |
| 5     | `reminder.lock.withAdvisoryLock`, transação UPDATE condicional  |
| 6     | `reminder.window.computeReminderWindow`                         |
| 7     | Route handler validando `CRON_SECRET` + origem                  |
| 8     | Logs estruturados + response JSON resumo                        |
| 9     | `feature-flags.ts` + seed                                       |
| 10    | Migration `reminderSentAt`, índice composto                     |

## Impacto em Código Existente

- `prisma/schema.prisma`: adiciona campo e índice em `Appointment`
- `vercel.json`: adiciona entrada de cron
- `src/app/api/appointments/[id]/reminder/route.ts`: mantido (fluxo manual permanece)
- `src/services/notification.ts`: reutiliza `notifyAppointmentReminder` para in-app quando aplicável
- Nenhuma breaking change para consumers existentes

## Observabilidade

Formato de log estruturado:

```json
{
  "source": "cron.appointment-reminders",
  "executionId": "uuid",
  "event": "batch.completed",
  "eligibleCount": 12,
  "sentCount": 11,
  "failedCount": 1,
  "skippedCount": 0,
  "durationMs": 3412
}
```

Eventos:

- `batch.started`
- `batch.lock_skipped`
- `batch.flag_disabled`
- `appointment.dispatch_succeeded` (por item, com `appointmentId`, `channel`)
- `appointment.dispatch_failed` (com `errorCode`, sem PII)
- `batch.completed`
