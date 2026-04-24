# Plano de Implementação — Transactional Emails

Rollout em fases. TDD obrigatório: teste falhando antes da implementação. Feature flag `transactionalEmails` começa **off** em todos os ambientes.

- [ ] 1. Infra e dependências
  - [ ] 1.1 Instalar `resend` e `@react-email/render` + `@react-email/components` (`pnpm add resend @react-email/render @react-email/components`)
  - [ ] 1.2 Adicionar variáveis em `docs/environment-variables.md`: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_UNSUBSCRIBE_SECRET`
  - [ ] 1.3 Registrar flag `transactionalEmails` em `src/config/feature-flags.ts` (category `notifications`, default `false`, `clientSafe: false`)
  - [ ] 1.4 Adicionar categoria `notifications` ao tipo `FeatureFlagCategory` caso não exista
  - [ ] 1.5 Teste: `feature-flags.test.ts` valida chave registrada
  _Requirements: 1.6, todos_

- [ ] 2. Schema Prisma — guest email + outbox + suppression + preferências
  - [ ] 2.1 Migration: adicionar `email`, `emailOptedOutAt`, `locale` em `GuestClient`
  - [ ] 2.2 Migration: adicionar `emailPreferences` (Json) + `locale` em `Profile`
  - [ ] 2.3 Migration: criar tabela `EmailOutbox` + enum `EmailOutboxStatus`
  - [ ] 2.4 Migration: criar tabela `EmailSuppression`
  - [ ] 2.5 Rodar `pnpm prisma generate`
  - [ ] 2.6 Teste de contrato: `prisma-schema.test.ts` valida presença dos campos/enums
  _Requirements: 6.1, 7.1, 9.1, 10.2_

- [ ] 3. Wrapper `sendEmail` — testes primeiro
  - [ ] 3.1 Teste: `sendEmail` retorna `SKIPPED_DISABLED` quando flag off
  - [ ] 3.2 Teste: `sendEmail` retorna `SKIPPED_SUPPRESSED` quando email em `EmailSuppression`
  - [ ] 3.3 Teste: `sendEmail` retorna `SKIPPED_OPTED_OUT` quando `emailPreferences.<category>` é false
  - [ ] 3.4 Teste: `sendEmail` retorna `SKIPPED_IDEMPOTENT` quando `idempotencyKey` já existe
  - [ ] 3.5 Teste: `sendEmail` chama Resend mock e marca `SENT` com `providerMessageId`
  - [ ] 3.6 Teste: `sendEmail` em erro transitório mantém `PENDING` com `attempts++` e `nextAttemptAt` com backoff
  - [ ] 3.7 Teste: `sendEmail` após 5 falhas marca `FAILED`
  - [ ] 3.8 Teste: `safeSend` nunca throws
  - [ ] 3.9 Implementar `src/services/email/resend-client.ts`, `outbox.ts`, `suppression.ts`, `preferences.ts`
  - [ ] 3.10 Implementar `sendEmail` e `safeSend` em `src/services/email/sendEmail.ts`
  - [ ] 3.11 Verificar todos os testes passam
  _Requirements: 1.4, 1.5, 1.6, 6.2, 6.3, 6.4, 7.3, 10.3_

- [ ] 4. Layout base React Email
  - [ ] 4.1 Teste snapshot: `EmailLayout` renderiza header/footer/CTA
  - [ ] 4.2 Implementar `src/emails/layouts/EmailLayout.tsx` com logo, cores do brand book, footer LGPD
  - [ ] 4.3 Implementar `components/Button.tsx`, `components/AppointmentCard.tsx`, `components/Footer.tsx`
  - [ ] 4.4 Adicionar `public/emails/logo.png` (480×480 @ 2x) a partir do logo oficial
  - [ ] 4.5 Consultar `docs/Brand_Book_Gold_Mustache.md` para tokens finais (cores, tipografia, tom)
  _Requirements: 4.1, 4.2, 4.5, 8.1_

- [ ] 5. i18n para emails
  - [ ] 5.1 Criar `src/i18n/locales/pt-BR/emails.json` com strings de confirmação, cancelamento, lembrete
  - [ ] 5.2 Criar `src/i18n/locales/en/emails.json`
  - [ ] 5.3 Criar `src/i18n/locales/es/emails.json`
  - [ ] 5.4 Implementar `loadEmailMessages(locale)` em `src/services/email/render.ts`
  - [ ] 5.5 Teste: 3 locales retornam as mesmas chaves (shape match)
  _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Template: `AppointmentConfirmation`
  - [ ] 6.1 Teste snapshot (pt-BR, en, es) do HTML renderizado
  - [ ] 6.2 Teste snapshot do plaintext
  - [ ] 6.3 Implementar `src/emails/templates/AppointmentConfirmation.tsx`
  - [ ] 6.4 Implementar `resolveTemplateData` para o template (join appointment + service + barber + client)
  - [ ] 6.5 Teste: subject line correto por locale
  _Requirements: 1.1, 1.2, 1.7, 4.3, 4.4, 5.3_

- [ ] 7. Template: `AppointmentCancellation`
  - [ ] 7.1 Teste snapshot (3 locales × 2 variantes: por cliente / por barbeiro-admin com motivo)
  - [ ] 7.2 Implementar `src/emails/templates/AppointmentCancellation.tsx`
  - [ ] 7.3 Teste: aviso de política quando cancelamento com <2h de antecedência
  - [ ] 7.4 Teste: motivo só aparece quando `cancelledBy !== "client"`
  _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 8. Template: `AppointmentReminder`
  - [ ] 8.1 Teste snapshot (3 locales)
  - [ ] 8.2 Implementar `src/emails/templates/AppointmentReminder.tsx` (serviço, data, endereço, Google Maps, telefone, cancelar)
  - [ ] 8.3 Teste: `sendEmail` com idempotencyKey `appointment-reminder:{id}:24h` respeita idempotência
  _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Integração com `booking.ts` — confirmação
  - [ ] 9.1 Teste: `createAppointment` cliente autenticado dispara `safeSend("appointment-confirmation")` com idempotencyKey correto
  - [ ] 9.2 Teste: `createAppointment` guest com email dispara safeSend
  - [ ] 9.3 Teste: `createAppointment` guest sem email NÃO dispara safeSend
  - [ ] 9.4 Teste: rollback da transação não dispara email (`safeSend` chamado após commit)
  - [ ] 9.5 Implementar hook pós-commit em `createAppointment` e `createAppointmentByBarber`
  - [ ] 9.6 Persistir `GuestClient.email` e `locale` quando informados
  _Requirements: 1.1, 1.2, 1.3, 9.2, 9.3, 9.4_

- [ ] 10. Integração com `booking.ts` — cancelamento
  - [ ] 10.1 Teste: `cancelAppointmentByClient` dispara safeSend sem motivo
  - [ ] 10.2 Teste: `cancelAppointmentByBarber` dispara com motivo
  - [ ] 10.3 Teste: `cancelAppointmentByGuestToken` dispara para email do guest
  - [ ] 10.4 Implementar 3 hooks
  _Requirements: 2.1, 2.2, 2.3_

- [ ] 11. Formulário de booking — captura de email guest
  - [ ] 11.1 Adicionar campo email opcional no formulário público (`src/components/custom/booking/*`)
  - [ ] 11.2 Validação Zod: email válido OU vazio
  - [ ] 11.3 Copy: "Opcional — usamos só para confirmação e lembrete" (i18n 3 locales)
  - [ ] 11.4 Teste component: submissão com/sem email funciona
  _Requirements: 9.1, 9.2, 9.3_

- [ ] 12. Rota cron `/api/cron/email-outbox`
  - [ ] 12.1 Teste: rota requer `Authorization: Bearer CRON_SECRET`
  - [ ] 12.2 Teste: processa até 50 itens PENDING com `nextAttemptAt <= now()`
  - [ ] 12.3 Teste: re-tenta com backoff; marca FAILED após 5 tentativas
  - [ ] 12.4 Implementar rota em `src/app/api/cron/email-outbox/route.ts`
  - [ ] 12.5 Adicionar schedule `*/1 * * * *` em `vercel.json`
  _Requirements: 6.4, 6.5_

- [ ] 13. Webhook Resend `/api/webhooks/resend`
  - [ ] 13.1 Teste: rejeita request sem `svix-signature` válida (401)
  - [ ] 13.2 Teste: evento `email.delivered` atualiza `EmailOutbox.status`
  - [ ] 13.3 Teste: evento `email.bounced` + `hard_bounce` cria registro em `EmailSuppression`
  - [ ] 13.4 Teste: evento `email.complained` desabilita marketing em `Profile.emailPreferences`
  - [ ] 13.5 Implementar rota `src/app/api/webhooks/resend/route.ts`
  _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 14. UI de preferências de email
  - [ ] 14.1 Rota pública `/preferencias-email/[token]` — HMAC validation
  - [ ] 14.2 Rota autenticada `/perfil/preferencias` com toggles por categoria
  - [ ] 14.3 API `PATCH /api/account/email-preferences`
  - [ ] 14.4 Teste: link do footer abre página e salva preferência
  _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 15. Histórico de emails (LGPD)
  - [ ] 15.1 API `GET /api/account/email-history` retorna últimos 90 dias do `EmailOutbox` do usuário
  - [ ] 15.2 UI em `/perfil/privacidade` exibindo lista
  - [ ] 15.3 Teste: usuário A não vê emails do usuário B
  _Requirements: 8.4_

- [ ] 16. Admin — painel de reputação
  - [ ] 16.1 Página `/admin/emails` com métricas: enviados, entregues, bounced, complained, opened (últimos 30d)
  - [ ] 16.2 Lista de `EmailSuppression` com ação "remover"
  - [ ] 16.3 Teste: acesso restrito a role ADMIN
  _Requirements: 10.5_

- [ ] 17. Rollout e validação final
  - [ ] 17.1 Configurar DNS (SPF + DKIM + DMARC) de `goldmustachebarbearia.com.br` no Resend
  - [ ] 17.2 Smoke test em staging: habilitar flag `transactionalEmails=true` apenas em staging e validar 3 templates com sandbox Resend
  - [ ] 17.3 Rodar `pnpm test:gate`
  - [ ] 17.4 Rodar `pnpm build`
  - [ ] 17.5 Revisão visual Litmus/Email on Acid (Gmail, Outlook, Apple Mail, Yahoo)
  - [ ] 17.6 Documentar runbook em `docs/transactional-emails-runbook.md` (troubleshooting, como suprimir, como ver logs)
  - [ ] 17.7 Rollout gradual em prod: liga flag para 10% dos usuários via env override por ambiente, monitora bounce rate; se < 2%, 100% após 7 dias
  _Requirements: todos_
