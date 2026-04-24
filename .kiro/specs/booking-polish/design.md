# Design — Booking Polish (P2)

## Visão geral

5 ajustes no subsistema de Booking agrupados em uma única entrega. Todas as
mudanças respeitam o advisory lock por barbeiro já existente
(`lockBarberDateForBooking`) e se integram ao fluxo transacional atual
(`prisma.$transaction`). Nenhuma mudança de schema Prisma exceto a nova razão
de cancelamento documentada como enum canônico (já suportado pelo campo
`cancellationReason: String?`).

## Arquitetura lógica

```
cliente/guest ───▶ hook useBooking
                     │
                     ▼
               API route (appointments / absences)
                     │
                     ▼
               service booking.ts / absences route
                     │  (prisma.$transaction)
                     │     1. lockBarberDateForBooking (PRESERVADO)
                     │     2. lockClientDateForBooking (NOVO)
                     │     3. validações (R3 contagem, R4 overlap)
                     │     4. insert / update
                     ▼
               notification.ts (cancelAbsence path)
```

## R1 — Mensagem de lead time sincronizada

### Arquivos tocados

| Arquivo                                            | Mudança                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| `src/lib/booking/lead-time.ts`                     | Já é a fonte (`CLIENT_BOOKING_LEAD_MINUTES = 90`). Adicionar helper `formatLeadTimeMessage(locale)` que devolve a string em cada idioma, ou preferencialmente apenas expor a constante e delegar o format ao i18n. |
| `src/app/api/appointments/route.ts` (L212–217)     | Trocar literal `"1 hora"` por uma message builder que concatena `CLIENT_BOOKING_LEAD_MINUTES` — ex.: `` `Agendamento deve ser feito com pelo menos ${CLIENT_BOOKING_LEAD_MINUTES} minutos de antecedência` `` ou uma formatação humana (`90 minutos` ou `1h30`). |
| `src/app/api/appointments/guest/route.ts`          | Idem à linha ~84. |
| `src/hooks/useBooking.ts` (L20–32)                 | Remover literal; consumir i18n `booking.slotErrors.tooSoon` ou a constante + helper. |
| `src/i18n/locales/{pt-BR,en,es}/booking.json`      | Adicionar chaves `slotErrors.tooSoon`, `slotErrors.slotInPast`, `slotErrors.clientLimitReached` parametrizadas por `{minutes}` / `{max}`. |

### Mudança

Tipo: **config + i18n + hook + API message**. Fonte única: constante
`CLIENT_BOOKING_LEAD_MINUTES`. Helper `formatLeadTimeHuman(minutes)` devolve:

- `minutes < 60` → `"${minutes} minutos"` / `"${minutes} minutes"` / `"${minutes} minutos"`;
- `minutes % 60 === 0` → `"${minutes/60} hora(s)"`;
- caso misto (90) → `"1h30"` / `"1h30"` / `"1h30"` ou `"90 minutos"` para manter
  precisão — escolher **"90 minutos"** por clareza no pt-BR e equivalência
  literal em en/es.

### Por quê

Fonte única da verdade reduz manutenção e evita bug que gerou esse requisito.
Mensagens em i18n já contempla 3 idiomas.

## R2 — Ausência cancela conflitos automaticamente

### Arquivos tocados

| Arquivo                                                 | Mudança                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| `src/config/feature-flags.ts`                           | Adicionar `BOOKING_ABSENCE_CONFLICT_POLICY` com valores `"cancel" | "reject"`; default `"cancel"`. |
| `src/app/api/barbers/me/absences/route.ts` (L86–176)    | Substituir `if (conflicts.length > 0) return apiError(...)` por branch dependendo da flag. |
| `src/services/booking.ts`                               | Nova função `cancelAppointmentsForAbsence(tx, barberId, conflicts, reason)` reutilizada pelo route. |
| `src/services/notification.ts`                          | Adicionar `notifyAppointmentCancelledByAbsence(appointment)` (cliente + barbeiro). |
| `prisma/schema.prisma`                                  | **Nenhuma** mudança de schema; usar `cancellationReason = "ABSENCE_AUTO_CANCEL"` como literal enum-like (string). Opcional: adicionar enum `CancellationReason` — fora do escopo se hoje é string livre. |

### Decisão: cancelar automaticamente

Motivação:

- UX de barbeiro é drasticamente melhor (auditoria registra isso como dor P2).
- Erro 409 atual obriga o barbeiro a cancelar manualmente cada cliente antes de
  reinserir a ausência — propenso a erro.
- Ao cancelar com `cancelledBy = "SYSTEM"` e razão explícita
  (`ABSENCE_AUTO_CANCEL`), mantém-se rastreabilidade para auditoria e KPIs.

Fallback: Flag `BOOKING_ABSENCE_CONFLICT_POLICY = "reject"` preserva o
comportamento atual para rollback via env sem redeploy de código.

### Fluxo transacional

```ts
await prisma.$transaction(async (tx) => {
  if (policy === "cancel") {
    await cancelAppointmentsForAbsence(tx, barberId, conflicts,
                                       "ABSENCE_AUTO_CANCEL");
  }
  const absence = await tx.barberAbsence.create({ data: ... });
  return absence;
});
// Depois da transação → disparar notificações
for (const apt of cancelled) {
  await notifyAppointmentCancelledByAbsence(apt);
}
```

Notificações fora da transação (best effort); falhas de notificação NÃO
revertem o cancelamento.

### Por quê

- `$transaction` garante atomicidade (R2.6).
- Notificações pós-commit evitam envio com rollback pendente.

## R3 — Limite de agendamentos simultâneos por cliente

### Arquivos tocados

| Arquivo                                          | Mudança                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `src/config/feature-flags.ts`                    | `BOOKING_MAX_ACTIVE_PER_CLIENT` (default 3, number).        |
| `src/services/booking.ts`                        | Nova função privada `assertClientUnderActiveLimit(tx, clientKey)` — usada em `createAppointment`, `createGuestAppointment`. **NÃO** em `createAppointmentByBarber`. |
| `src/lib/validations/booking.ts`                 | Não muda; permanece a validação Zod de input. |
| `src/hooks/useBooking.ts`                        | `translateSlotError` mapeia `CLIENT_LIMIT_REACHED` → mensagem i18n. |
| `src/i18n/locales/**/booking.json`               | Chave `slotErrors.clientLimitReached` com `{max}`.          |

### Semântica do `clientKey`

- Cliente autenticado: `clientId: string`.
- Guest: `normalizePhoneDigits(input.phone)` — **depois** que o `GuestClient`
  foi resolvido/criado na mesma transação.

Contagem:

```ts
const count = await tx.appointment.count({
  where: {
    status: AppointmentStatus.CONFIRMED,
    // futuro: date > today OR (date = today AND startTime > now)
    OR: [
      { date: { gt: todayUtc } },
      { AND: [{ date: todayUtc }, { startTime: { gt: hhmmNow } }] },
    ],
    ...(isGuest
      ? { guestClient: { phoneDigits: normalizedPhone } }
      : { clientId }),
  },
});
if (count >= BOOKING_MAX_ACTIVE_PER_CLIENT) {
  throw new BookingError("CLIENT_LIMIT_REACHED");
}
```

### Por quê

- Conta dentro da transação (R3.6) para evitar TOCTOU.
- Não aplica a `createAppointmentByBarber` porque staff tem discrição
  operacional (R3.4).

## R4 — Cliente não pode reservar 2 barbeiros no mesmo horário

### Arquivos tocados

| Arquivo                               | Mudança                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `src/services/booking.ts`             | Nova função `lockClientDateForBooking(tx, clientKey, dateKey)` análoga a `lockBarberDateForBooking`. Adicionar chamada em `createAppointment` (L670), `createGuestAppointment` (L824), `createAppointmentByBarber` (L990), **sempre após** o lock por barbeiro. |
| `src/services/booking.ts`             | Nova verificação de overlap por cliente: `hasOverlappingClientAppointment(tx, clientKey, date, start, end)` — espelho de `hasOverlappingAppointment`. |

### Decisão: advisory lock composto + findFirst

Assinatura do lock:

```sql
SELECT pg_advisory_xact_lock(
  hashtext(${clientKey}),
  hashtext(${dateKey})
)
```

Onde:

- `clientKey` = `clientId` do Profile **ou** `"guest:" || normalizedPhone`.
- `dateKey` = `yyyy-mm-dd` do `appointmentDate`.

Ordem determinística de aquisição:

1. `pg_advisory_xact_lock(hashtext(barberId), hashtext(dateKey))` (já existe).
2. `pg_advisory_xact_lock(hashtext(clientKey), hashtext(dateKey))` (novo).

A ordem é determinística porque dois agendamentos que compartilham cliente
mas barbeiros diferentes adquirem o lock do cliente em ordem serializada pelo
PostgreSQL. O lock de barbeiro é adquirido primeiro — cliente concorrendo no
mesmo barbeiro continua serializado pelo lock antigo; cliente concorrendo em
barbeiros diferentes agora serializa no novo lock.

Overlap check:

```ts
const conflict = await tx.appointment.findFirst({
  where: {
    status: AppointmentStatus.CONFIRMED,
    date: appointmentDate,
    ...(isGuest
      ? { guestClient: { phoneDigits: normalizedPhone } }
      : { clientId }),
    AND: [
      { startTime: { lt: newEnd } },
      { endTime: { gt: newStart } },
    ],
  },
  select: { id: true, barberId: true, startTime: true, endTime: true },
});
if (conflict) throw new BookingError("CLIENT_DOUBLE_BOOKING");
```

### Prevenção de deadlock

- Todos os call-sites adquirem locks na **mesma ordem** (`barber` antes de
  `client`). Não há ciclo possível.
- O lock de cliente usa namespace `hashtext(clientKey)` distinto do
  `hashtext(barberId)`, evitando colisão acidental.

### Por quê

- `pg_advisory_xact_lock` alinhado com o padrão atual do repositório.
- `findFirst` dentro do lock garante serialização real, não apenas otimista.
- Não altera schema nem índices (o índice composto de
  `(status, date, clientId)` já é eficiente; se não for, criar migração
  adicional).

## R5 — Remoção de símbolos deprecated

### Arquivos tocados

| Arquivo                                                        | Mudança            |
| -------------------------------------------------------------- | ------------------ |
| `src/services/booking.ts` (L1929–2008, L2115–2217)             | Remover `getGuestAppointments` e `cancelAppointmentByGuest` (também deprecated, encontrar se é consumido). |
| `src/lib/booking/cancellation.ts`                              | Remover `canCancelBeforeStart` e `shouldWarnLateCancellation`. |
| `src/services/__tests__/booking.service.test.ts` (L56–57, L1256+) | Remover imports e testes associados; substituir pelo teste já existente de `getGuestAppointmentsByToken`. |
| `src/services/__tests__/booking.property.test.ts`              | Remover import + prop test da função deprecated. |
| `src/lib/booking/__tests__/cancellation.test.ts`               | Remover bloco `describe("canCancelBeforeStart (deprecated)")`. |

Verificação pós-remoção (manual + teste):

- `grep -R "getGuestAppointments\b" src/` → 0.
- `grep -R "canCancelBeforeStart\b" src/` → 0.
- Endpoints `api/appointments/guest/lookup` e `api/appointments/guest/{id}/cancel`
  continuam funcionando (usam `getGuestAppointmentsByToken` e
  `cancelAppointmentByGuestToken`).

### Por quê

- Reduz superfície de ataque: `getGuestAppointments(phone)` permite enumerar
  histórico por telefone sem token, mesmo sendo "deprecated" — removê-lo fecha
  uma porta lateral.
- `canCancelBeforeStart` é substituído por `canClientCancelOutsideWindow`, com
  janela de 2h; manter ambos confunde desenvolvedores.

## Traceability (requisito → arquivo → teste)

| Req   | Arquivo                                              | Teste                                                    |
| ----- | ---------------------------------------------------- | -------------------------------------------------------- |
| R1.1  | `lib/booking/lead-time.ts`                           | `lib/booking/__tests__/lead-time.test.ts`                |
| R1.2  | `api/appointments/route.ts`, `api/appointments/guest/route.ts` | `api/appointments/__tests__/route.test.ts`     |
| R1.3  | `hooks/useBooking.ts`                                | `hooks/__tests__/useBooking.test.tsx` (novo)             |
| R1.4  | `i18n/locales/**/booking.json`                       | `i18n/locales/__tests__/booking-messages.test.ts` (novo) |
| R2    | `api/barbers/me/absences/route.ts`, `services/booking.ts` | `api/barbers/me/absences/__tests__/route.test.ts`   |
| R2.3  | `services/notification.ts`                           | `services/__tests__/notification.test.ts`                |
| R3    | `services/booking.ts`                                | `services/__tests__/booking.service.test.ts`             |
| R4    | `services/booking.ts`                                | `services/__tests__/booking.service.test.ts` (+ teste de concorrência) |
| R5    | `services/booking.ts`, `lib/booking/cancellation.ts` | suites existentes ajustadas                              |

## Non-functional

- Performance: adicionar 1 lock + 1 query `findFirst` por criação de
  agendamento. No happy path, custo < 5 ms.
- Observabilidade: logar `CLIENT_LIMIT_REACHED`, `CLIENT_DOUBLE_BOOKING` e
  `ABSENCE_AUTO_CANCEL` como eventos estruturados (pino/console estruturado do
  projeto). Sem PII.
- Segurança: nunca expor `clientKey` em responses — só o código de erro.
- Acessibilidade/i18n: mensagens em 3 idiomas, sem concatenação ad-hoc.

## Riscos & mitigação

1. **Deadlock nos 2 locks** — Mitigado pela ordem determinística (barber →
   client) e namespaces distintos.
2. **Cancelamento em massa surpresa** (R2) — Mitigado pela flag
   `"reject"` como escape hatch e pela notificação obrigatória.
3. **Limite errado de 3** (R3) — Mitigado pela config: ajuste via env sem
   redeploy.
4. **Remoção de `getGuestAppointments` quebra chamador esquecido** (R5) —
   Grep exaustivo documentado, PR bloqueado se surgir match.

## Plano de rollback

- R1: revert simples do literal.
- R2: `BOOKING_ABSENCE_CONFLICT_POLICY=reject`.
- R3: `BOOKING_MAX_ACTIVE_PER_CLIENT=999`.
- R4: feature flag `BOOKING_CLIENT_LOCK_ENABLED` (opcional no início, remove
  na versão seguinte).
- R5: revert do PR (sem feature flag aplicável; cobertura de testes e grep
  reduzem o risco).
