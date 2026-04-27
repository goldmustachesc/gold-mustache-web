# Plano de Implementação — appointment-reminders-cron

Cada tarefa segue TDD estrito (RED → GREEN → REFACTOR), SDD (Subagent-Driven Development) e rodar `pnpm test:gate` antes de abrir PR. Tipos explícitos, proibido `any`. Commits no padrão Conventional Commits.

---

## Fase 1 — Schema e Migrations

- [ ] **1.1. Adicionar campo `reminderSentAt` em `Appointment`**
  - Editar `prisma/schema.prisma`: adicionar `reminderSentAt DateTime? @map("reminder_sent_at")`
  - Adicionar índice composto `@@index([status, date, reminderSentAt])`
  - Rodar `pnpm prisma migrate dev --name appointment_reminder_sent_at`
  - Validar SQL gerada (ALTER TABLE + CREATE INDEX)
  - _Reqs: 2.3, 10.1_

- [ ] **1.2. Seed de feature flags**
  - Adicionar em `prisma/seed.ts` upsert idempotente das flags `appointmentReminders` e `appointmentRemindersWhatsapp` (ambas `enabled: false`)
  - Documentar descrições em pt-BR
  - Rodar `pnpm prisma db seed` em dev e validar via query
  - _Reqs: 9.1, 9.2, 9.4_

---

## Fase 2 — Utilitário de Janela Temporal

- [ ] **2.1. RED: testes de `computeReminderWindow`**
  - Criar `src/services/reminders/__tests__/reminder.window.test.ts`
  - Casos: janela correta em horário padrão, em borda de dia, com DST simulado (NY → manter fixo SP), erro em timezone inválida
  - _Reqs: 6.1, 6.2, 6.3_

- [ ] **2.2. GREEN: implementar `reminder.window.ts`**
  - Criar `src/services/reminders/reminder.window.ts` com `computeReminderWindow` e `appointmentStartsAtUtc`
  - Usar `date-fns-tz` (verificar se já está em deps; senão instalar)
  - Exportar tipos `ReminderWindow`
  - _Reqs: 6.1, 6.2_

- [ ] **2.3. REFACTOR: centralizar utilitários já existentes**
  - Avaliar se `src/utils/datetime.ts` já tem `formatDateDdMmYyyyFromIsoDateLike`; reutilizar onde possível
  - Exportar helpers compartilhados

---

## Fase 3 — Service de Seleção

- [ ] **3.1. RED: testes `findEligibleAppointments`**
  - Criar `src/services/reminders/__tests__/reminder.service.test.ts`
  - Mockar `prisma` via `vitest-mock-extended`
  - Casos: retorna só CONFIRMED, filtra `reminderSentAt` nulo, respeita janela 23h-25h, select mínimo
  - _Reqs: 2.1, 2.2, 2.3, 2.6_

- [ ] **3.2. GREEN: implementar `findEligibleAppointments`**
  - Criar `src/services/reminders/reminder.service.ts`
  - Query Prisma com `where: { status: 'CONFIRMED', reminderSentAt: null, ... janela }`
  - `include` mínimo: `service.name`, `barber.name/userId`, `client.fullName/phone/email/emailVerified`, `guestClient.fullName/phone`
  - _Reqs: 2.1, 2.4, 2.5, 2.6_

---

## Fase 4 — Advisory Lock

- [ ] **4.1. RED: testes `withAdvisoryLock`**
  - Criar `src/services/reminders/__tests__/reminder.lock.test.ts`
  - Mockar `prisma.$queryRaw` / `prisma.$executeRaw`
  - Casos: adquire → executa fn → libera; não adquire → retorna `acquired: false`; libera mesmo em exceção
  - _Reqs: 5.1, 5.2_

- [ ] **4.2. GREEN: implementar `reminder.lock.ts`**
  - `SELECT pg_try_advisory_lock($1)` / `pg_advisory_unlock($1)`
  - Chave derivada determinística (sha256 prefixado)
  - Garantir `finally` com unlock
  - _Reqs: 5.1, 5.2_

---

## Fase 5 — Dispatcher (Email + WhatsApp)

- [ ] **5.1. RED: testes `dispatchEmail`**
  - Casos: sucesso, erro transitório com retry, erro permanente sem retry, rate limit respeitado
  - Mockar módulo de email da spec `transactional-emails`
  - _Reqs: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] **5.2. GREEN: implementar `reminder.dispatcher.ts`**
  - `dispatchEmail(input)` com retry exponencial `[500ms, 2s, 5s]`
  - Classificação `TransientError` vs `PermanentError`
  - _Reqs: 3.1, 3.3_

- [ ] **5.3. RED+GREEN: `dispatchWhatsappDeepLink`**
  - Testes: cria `Notification` para barber com `channel: 'whatsapp-deeplink'` e URL válida
  - Impl: usa `notifyAppointmentReminder` existente + `data.whatsappUrl`
  - Gate pela flag `appointmentRemindersWhatsapp`
  - _Reqs: 4.1, 4.2_

---

## Fase 6 — `processReminderBatch` (orquestrador)

- [ ] **6.1. RED: testes de integração do batch**
  - Casos: batch vazio retorna zeros; 3 elegíveis → 3 sent; falha transitória no 2º não bloqueia 3º; `reminderSentAt` não é marcado em falha definitiva; skipped quando `UPDATE WHERE reminderSentAt IS NULL` retorna 0
  - _Reqs: 2, 3, 5.3, 5.4, 10.2_

- [ ] **6.2. GREEN: implementar `processReminderBatch`**
  - Consome `findEligibleAppointments`
  - Transação com `UPDATE ... WHERE reminder_sent_at IS NULL` antes do envio
  - Rollback lógico em falha definitiva
  - Chunking com `Promise.allSettled` (default 10)
  - Agrega `ProcessReminderBatchResult`
  - _Reqs: 3.5, 5.3, 5.4_

- [ ] **6.3. REFACTOR: extrair `buildReminderJob` puro**
  - Função pura para mapear `Appointment + includes → ReminderJob`
  - Testes unitários dedicados para edge cases (cliente sem email, guest sem telefone)

---

## Fase 7 — Rota de Cron

- [ ] **7.1. RED: testes da rota**
  - Criar `src/app/api/cron/appointment-reminders/__tests__/route.test.ts`
  - Casos: 401 sem header; 401 com bearer inválido; 500 sem `CRON_SECRET`; 200 com `skipped: true` se flag desligada; 200 com resumo quando habilitado; 200 `skipped: true, reason: 'already_running'` quando lock falha
  - _Reqs: 1.1, 1.3, 7.1, 7.2, 7.3, 5.2_

- [ ] **7.2. GREEN: criar `route.ts`**
  - Novo arquivo `src/app/api/cron/appointment-reminders/route.ts` (POST)
  - Seguir padrão de `src/app/api/cron/sync-instagram/route.ts` para auth
  - Validar flag → `withAdvisoryLock` → `processReminderBatch` → responder
  - _Reqs: 1.1, 1.4, 7.1, 7.4_

---

## Fase 8 — Configuração Vercel Cron

- [ ] **8.1. Editar `vercel.json`**
  - Adicionar entrada `{ "path": "/api/cron/appointment-reminders", "schedule": "*/15 * * * *" }`
  - Validar JSON com `pnpm vercel --version` ou similar
  - _Reqs: 1.1, 1.2_

- [ ] **8.2. Documentar variáveis de ambiente**
  - Atualizar `.env.example` (ou equivalente não-secret) com `CRON_SECRET=...`
  - Instruir configuração em Vercel Dashboard → Environment Variables
  - _Reqs: 7.1, 7.2_

---

## Fase 9 — Observabilidade

- [ ] **9.1. RED: testes de logs estruturados**
  - Verificar eventos emitidos: `batch.started`, `appointment.dispatch_succeeded`, `appointment.dispatch_failed`, `batch.completed`
  - Confirmar máscara de email (`j***@example.com`)
  - _Reqs: 8.1, 8.2, 8.4_

- [ ] **9.2. GREEN: implementar logger estruturado**
  - Criar `src/services/reminders/reminder.logger.ts` (wrapper `console.log(JSON.stringify(...))`)
  - Não vazar PII completa
  - _Reqs: 8.1, 8.2, 8.4, 8.5_

- [ ] **9.3. Resposta HTTP com resumo**
  - Garantir que endpoint retorna `{ executionId, sentCount, failedCount, skippedCount, durationMs }`
  - _Reqs: 8.3_

---

## Fase 10 — Feature Flags no Fluxo

- [ ] **10.1. Integração com `feature-flags.ts`**
  - Ler flag `appointmentReminders` no início do handler
  - Ler flag `appointmentRemindersWhatsapp` antes de dispatchar WhatsApp
  - Testes cobrem caminhos habilitado/desabilitado
  - _Reqs: 9.1, 9.2, 9.3_

---

## Fase 11 — Testes de Integração End-to-End

- [ ] **11.1. Teste integrado com banco real de testes**
  - Seed 3 agendamentos: (a) dentro da janela, sem reminder → enviado; (b) dentro da janela, com reminder → pulado; (c) fora da janela → ignorado
  - Mock do provider de email
  - Executa handler → valida `reminderSentAt` preenchido apenas em (a)
  - _Reqs: 2.1, 2.2, 2.3, 5.3, 10.1_

- [ ] **11.2. Teste de concorrência**
  - Disparar 2 chamadas simultâneas ao handler
  - Validar que apenas 1 execução processa (advisory lock) e outra retorna `skipped: true`
  - _Reqs: 5.1, 5.2, 5.4_

- [ ] **11.3. Teste de idempotência dupla camada**
  - Desabilitar lock temporariamente no teste; validar que UPDATE condicional ainda previne duplicação
  - _Reqs: 5.3, 5.4_

---

## Fase 12 — Gate Final e PR

- [ ] **12.1. `pnpm lint` verde (Biome)**
- [ ] **12.2. `pnpm test` verde (Vitest)**
- [ ] **12.3. `pnpm test:gate` verde (lint + test + coverage)**
- [ ] **12.4. Verificar ausência total de `any`**
- [ ] **12.5. Atualizar `docs/` ou README se necessário (fluxo operacional do cron)**
- [ ] **12.6. Abrir PR com Conventional Commit**
  - Tipo: `feat(notifications)`
  - Mensagem: `feat(notifications): automate appointment reminders via cron (24h before)`
  - Descrição: resumo de changes, riscos, plano de rollback (desligar flag `appointmentReminders`)

---

## Plano de Rollback

- **Rollback imediato**: setar `FeatureFlag.appointmentReminders.enabled = false` via admin/SQL
- **Rollback de schema**: `prisma migrate resolve --rolled-back` + migration reversa removendo coluna (apenas se não houver dados relevantes)
- **Rollback de vercel.json**: remover linha do cron e redeploy

## Dependências Externas

- Spec `transactional-emails` DEVE expor `sendTemplate("appointment-reminder", payload)` antes da Fase 5.2
- `CRON_SECRET` DEVE estar configurado em Vercel antes do deploy de produção
