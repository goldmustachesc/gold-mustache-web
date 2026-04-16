# Tasks — Booking Polish (P2)

> Ordem TDD estrita: **RED** (teste falhando) → **GREEN** (código mínimo) →
> **REFACTOR**. Cada task lista `pnpm` commands a executar. Nada de `any`.
> Preservar advisory lock por barbeiro existente em todas as alterações.

## 0. Preparação

- [ ] 0.1 — Criar branch `feat/booking-polish` a partir de `staging`.
- [ ] 0.2 — Rodar `pnpm test:gate` uma vez e registrar baseline verde (cobertura
  + tempo) para comparar ao final.
- [ ] 0.3 — Reler `docs/auditoria-projeto-2026-04-15.md` §P2 #12, #13, #14, #20.

## 1. R1 — Mensagem de lead time (TDD)

- [ ] 1.1 **RED** — Adicionar teste em
  `src/lib/booking/__tests__/lead-time.test.ts` que assert:
  - `CLIENT_BOOKING_LEAD_MINUTES === 90`.
  - `formatLeadTimeHuman(90, "pt-BR") === "90 minutos"`.
  - `formatLeadTimeHuman(60, "en") === "1 hora"`-equivalente — assert idioma.
- [ ] 1.2 **RED** — Adicionar teste em
  `src/app/api/appointments/__tests__/route.test.ts` que chama `POST` com slot
  dentro do lead time e verifica `message.includes(String(CLIENT_BOOKING_LEAD_MINUTES))`.
- [ ] 1.3 **RED** — Adicionar teste em
  `src/hooks/__tests__/useBooking.test.tsx` (novo) que renderiza o hook,
  força um `ApiError` com code `SLOT_TOO_SOON` e assert a mensagem final usa
  o valor atual em pt-BR.
- [ ] 1.4 **RED** — Adicionar teste em
  `src/i18n/locales/__tests__/booking-messages.test.ts` (novo) que garante
  `slotErrors.tooSoon` existe em pt-BR/en/es e aceita placeholder `{minutes}`.
- [ ] 1.5 **GREEN** — Implementar:
  - `formatLeadTimeHuman(minutes, locale)` em `src/lib/booking/lead-time.ts`.
  - Atualizar `src/app/api/appointments/route.ts:215` e
    `src/app/api/appointments/guest/route.ts:84` para consumir a constante.
  - Atualizar `src/hooks/useBooking.ts:22-23` para usar i18n + constante.
  - Adicionar chaves i18n em pt-BR, en, es.
- [ ] 1.6 **REFACTOR** — Eliminar duplicações; `grep -R "1 hora de antecedência" src/`
  deve retornar 0.
- [ ] 1.7 `pnpm test src/lib/booking src/hooks src/app/api/appointments src/i18n`
  verde.

## 2. R5 — Remover deprecated (antes de R3/R4 para reduzir ruído)

- [ ] 2.1 **RED** — Ajustar `src/services/__tests__/booking.service.test.ts` e
  `src/services/__tests__/booking.property.test.ts`: remover imports de
  `getGuestAppointments` e `canCancelBeforeStart` + ajustar testes.
- [ ] 2.2 **RED** — Ajustar
  `src/lib/booking/__tests__/cancellation.test.ts` removendo describe
  deprecated.
- [ ] 2.3 **GREEN** — Remover exports em `src/services/booking.ts`
  (`getGuestAppointments`, `cancelAppointmentByGuest`) e em
  `src/lib/booking/cancellation.ts` (`canCancelBeforeStart`,
  `shouldWarnLateCancellation`).
- [ ] 2.4 **GREEN** — `pnpm lint` e `pnpm test` sem erros.
- [ ] 2.5 **REFACTOR** — `grep -R "getGuestAppointments\b" src/` → 0;
  `grep -R "canCancelBeforeStart\b" src/` → 0.

## 3. R2 — Ausência cancela conflitos

- [ ] 3.1 **RED** — Adicionar em
  `src/app/api/barbers/me/absences/__tests__/route.test.ts`:
  - Teste: absence total (sem `startTime/endTime`) cobrindo 2 agendamentos
    confirmados → 201, ambos `CANCELLED` com
    `cancellationReason = "ABSENCE_AUTO_CANCEL"`.
  - Teste: absence parcial (10:00–12:00) cobrindo 1 agendamento às 11:00 →
    só esse é cancelado; outro às 14:00 intacto.
  - Teste: notificação enviada para cliente + barbeiro (mock de
    `notifyAppointmentCancelledByAbsence`).
  - Teste: erro forçado no `create(barberAbsence)` → nenhum agendamento
    cancelado (transação revertida).
  - Teste: com `BOOKING_ABSENCE_CONFLICT_POLICY=reject` → mantém 409
    `ABSENCE_CONFLICT`.
- [ ] 3.2 **GREEN** — Implementar:
  - Em `src/config/feature-flags.ts`: adicionar
    `BOOKING_ABSENCE_CONFLICT_POLICY` com leitura de env default `"cancel"`.
  - Em `src/services/booking.ts`: nova função
    `cancelAppointmentsForAbsence(tx, barberId, conflicts, reason)`.
  - Em `src/services/notification.ts`: nova função
    `notifyAppointmentCancelledByAbsence(appointment)` (cliente + barbeiro).
  - Em `src/app/api/barbers/me/absences/route.ts`: envolver em
    `prisma.$transaction`, cancelar conflitos quando policy === `"cancel"`,
    enviar notificações pós-commit.
- [ ] 3.3 **REFACTOR** — Extrair lógica de conflict-detection se passar a ser
  reutilizada (mantém `rangesOverlap` + `parseTimeToMinutes`).
- [ ] 3.4 `pnpm test src/app/api/barbers/me/absences src/services` verde.

## 4. R3 — Limite de agendamentos futuros por cliente

- [ ] 4.1 **RED** — Adicionar em
  `src/services/__tests__/booking.service.test.ts`:
  - Teste: cliente autenticado com 3 agendamentos futuros `CONFIRMED` → 4º
    falha com `CLIENT_LIMIT_REACHED`.
  - Teste: guest com 3 agendamentos pelo telefone normalizado → idem.
  - Teste: `createAppointmentByBarber` ignora o limite (R3.4).
  - Teste: agendamentos `CANCELLED/NO_SHOW/COMPLETED` ou passados não contam.
  - Teste: contagem ocorre dentro de `prisma.$transaction` (uso do `tx`
    mockado).
- [ ] 4.2 **RED** — Adicionar em `src/hooks/__tests__/useBooking.test.tsx`:
  `CLIENT_LIMIT_REACHED` traduzido para pt-BR com `{max}` correto.
- [ ] 4.3 **GREEN** —
  - `src/config/feature-flags.ts`: `BOOKING_MAX_ACTIVE_PER_CLIENT` (default 3).
  - `src/services/booking.ts`: função privada `assertClientUnderActiveLimit`
    usando `tx.appointment.count` com clausula de futuro; chamar em
    `createAppointment` (L619) e `createGuestAppointment` (L763).
  - `src/hooks/useBooking.ts`: mapear novo code no `SLOT_ERROR_MESSAGES`.
  - i18n: `slotErrors.clientLimitReached` com `{max}` em pt-BR/en/es.
- [ ] 4.4 **REFACTOR** — Consolidar helper de "is future"
  (`isAppointmentInFuture(date, startTime, now)`) se ainda não existe.
- [ ] 4.5 `pnpm test src/services src/hooks src/i18n` verde.

## 5. R4 — Advisory lock por cliente

- [ ] 5.1 **RED** — Adicionar em
  `src/services/__tests__/booking.service.test.ts`:
  - Teste: cliente autenticado reserva barbeiro A 10:00–10:30. Tentar reservar
    barbeiro B 10:15–10:45 → `CLIENT_DOUBLE_BOOKING`.
  - Teste: guest reserva barbeiro A. Tentar reservar barbeiro B no overlap pelo
    mesmo telefone → `CLIENT_DOUBLE_BOOKING`.
  - Teste: reservas no mesmo dia sem overlap passam (A 10:00–10:30, B
    11:00–11:30).
  - Teste: `createAppointmentByBarber` também bloqueia (R4.6).
  - Teste de concorrência: `Promise.all` com 2 criações simultâneas do mesmo
    cliente em barbeiros diferentes no mesmo intervalo → 1 sucesso, 1
    `CLIENT_DOUBLE_BOOKING`.
- [ ] 5.2 **GREEN** —
  - `src/services/booking.ts`:
    - Nova função `lockClientDateForBooking(tx, clientKey, dateKey)` que
      executa `pg_advisory_xact_lock(hashtext(${clientKey}), hashtext(${dateKey}))`.
    - Nova função `hasOverlappingClientAppointment(tx, clientKey, date, start, end)`.
    - Em `createAppointment`, `createGuestAppointment` e
      `createAppointmentByBarber`: **depois** de
      `lockBarberDateForBooking(tx, barberId, date)`, chamar
      `lockClientDateForBooking(tx, clientKey, date)` e então
      `hasOverlappingClientAppointment`.
    - Helper `buildClientKey({ clientId?: string; guestPhone?: string })` que
      devolve string canônica (`guest:<digits>` ou `<uuid>`).
  - `src/hooks/useBooking.ts`: mapear `CLIENT_DOUBLE_BOOKING` em
    `SLOT_ERROR_MESSAGES`.
  - i18n: `slotErrors.clientDoubleBooking` em 3 idiomas.
- [ ] 5.3 **REFACTOR** — Preservar `lockBarberDateForBooking` intacto; apenas
  adicionar chamada subsequente. Garantir ordem idêntica em todos os
  call-sites.
- [ ] 5.4 `pnpm test src/services src/hooks src/i18n` verde.

## 6. Regressão ampla

- [ ] 6.1 `pnpm test src/services/__tests__/booking.service.test.ts` — suite
  completa de booking.
- [ ] 6.2 `pnpm test src/services/__tests__/booking.property.test.ts` — se
  mantido, confirmar que property-based tests passam sem deprecated.
- [ ] 6.3 `pnpm test src/app/api/appointments` (route.test.ts, guest/route.test.ts).
- [ ] 6.4 `pnpm test src/app/api/barbers/me/absences`.
- [ ] 6.5 `pnpm test src/app/api/slots` — garantir que lead time ainda aparece
  em `applyLeadTime: true`.
- [ ] 6.6 `pnpm test src/components/dashboard` — teste de DailySchedule
  (absence + slots).
- [ ] 6.7 `pnpm lint`.
- [ ] 6.8 `pnpm test:gate` — gate completo (lint + test + coverage).

## 7. Documentação & PR

- [ ] 7.1 Atualizar `docs/auditoria-projeto-2026-04-15.md` marcando P2 #12,
  #13, #14, #20 como resolvidos com link para o PR.
- [ ] 7.2 Changelog: entrada `feat(booking)` cobrindo os 5 requisitos.
- [ ] 7.3 PR com checklist de evidências:
  - [ ] Testes verdes, screenshots das 3 mensagens i18n.
  - [ ] Grep de deprecated retornando 0.
  - [ ] Comprovação de concorrência (log do teste).
  - [ ] Flags documentadas (`BOOKING_ABSENCE_CONFLICT_POLICY`,
    `BOOKING_MAX_ACTIVE_PER_CLIENT`).
- [ ] 7.4 Commit convencional `feat(booking): polish P2 — lead-time message,
  absence auto-cancel, client limits, deprecation cleanup`.

## Dependencies

- Task 2 antes de 3/4/5 para evitar falsos positivos nos testes de regressão.
- Task 5 depois de 4 (lock por cliente reaproveita helper `buildClientKey`).
- Task 6 só depois de 1–5 completas.
