# Booking Flow — Production Readiness Audit

**Data:** 2026-04-28
**Branch:** `staging`
**Escopo:** Fluxo end-to-end de agendamento (cliente logado, guest, barbeiro, admin)
**Veredito:** arquitetura pronta, com stack free-tier definida e blockers principais implementados. Ainda falta validar rollout, limites e evidência operacional antes de liberar tráfego real.

---

## Resumo executivo

| Área | Estado |
|------|--------|
| Race condition / double-booking | ✅ Protegido (advisory lock + partial unique index) |
| Validação Zod | ✅ Completa |
| AuthZ (cliente, barbeiro, guest) | ✅ Implementado |
| Rate limit | ✅ Upstash Redis (distribuído) |
| CSRF / Origin check | ✅ `requireValidOrigin()` |
| Cancelamento + loyalty penalty | ✅ Integrado |
| Ausências recorrentes | ✅ Validadas |
| **Notificação externa (email/SMS/WhatsApp)** | 🟡 **IMPLEMENTADA** — Resend + in-app; WhatsApp manual via deeplink no launch |
| **Observabilidade (Sentry/logs estruturados)** | 🟡 **IMPLEMENTADA** — Sentry + `pino` + requestId |
| Idempotência POST | 🟡 Sem `Idempotency-Key` |
| Reagendamento atômico | 🟡 Não existe endpoint |
| RLS no Supabase | 🟡 Não validado neste audit |
| Acessibilidade (ARIA) UI booking | 🟡 Não auditado |

---

## 🔴 BLOCKERS

### B1. Notificações externas
**Arquivo:** [src/services/notification.ts](src/services/notification.ts)
**Status atual:** Resend foi integrado para email transacional; guests recebem deeplink manual de WhatsApp no launch.
**Risco restante:** lembrete automático de guest continua dependendo de ação humana até fase 2 com WhatsApp Business/Twilio.
**Como aplicar:** manter feature flags desligadas até validar secrets, domínio e fluxo manual do barbeiro.

### B2. Observabilidade
**Status atual:** Sentry + `pino` + `requestId` já foram adicionados.
**Risco restante:** conferir DSN, alertas e ruído de produção antes do go-live.
**Como aplicar:** validar captura de erro, cron monitor e correlação de logs em staging/prod.

### B3. Lembrete agendado
**Arquivo:** `.github/workflows/appointment-reminders.yml` (referenciado em `docs/ops/appointment-reminders.md`)
**Status atual:** GitHub Actions é o scheduler free-tier do launch; Vercel Hobby ficou só com jobs diários.
**Risco restante:** falha silenciosa do workflow e atraso de runner externo.
**Como aplicar:** manter retry no workflow, `advisory lock` no endpoint e monitor no Sentry.

### B4. Validar partial unique index em produção
**Arquivo:** [prisma/migrations/20251227230000_fix_rebooking_unique_index_drift/migration.sql](prisma/migrations/20251227230000_fix_rebooking_unique_index_drift/migration.sql)
**Achado:** Migration `appointments_unique_confirmed_slot WHERE status='CONFIRMED'` existe nas migrations. **Não confirmado** se foi aplicada no Supabase de produção.
**Como aplicar:** Rodar no SQL Editor do Supabase prod:
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'appointments' AND indexname = 'appointments_unique_confirmed_slot';
```
Se retornar vazio: `prisma migrate deploy` antes do go-live.

---

## 🟡 HIGH (resolver logo após launch ou em paralelo)

### H1. Idempotência ausente em `POST /api/appointments`
**Arquivo:** [src/app/api/appointments/route.ts](src/app/api/appointments/route.ts)
**Cenário:** Cliente em rede ruim, retry → 2 appointments criados (advisory lock não bloqueia se slots forem diferentes; mas dois POSTs em sequência rápida com timeouts criam duplicidade percebida).
**Como aplicar:** Aceitar header `Idempotency-Key`, cachear resposta 5 min no Redis (Upstash já está disponível).

### H2. Sem endpoint de reagendamento atômico
**Achado:** Cliente cancela e cria novo. Se segundo POST falhar, fica sem agendamento. Sem transação cobrindo as duas operações.
**Como aplicar:** `POST /api/appointments/[id]/reschedule` com `prisma.$transaction([cancel, create])` dentro do mesmo advisory lock.

### H3. RLS Supabase não auditado
**Achado:** Auth/AuthZ está em camada de aplicação (Prisma + checks manuais). Se alguém usar o anon key Supabase direto (cliente), RLS é a última linha. Não verificado neste audit.
**Como aplicar:** Listar políticas RLS por tabela em Supabase dashboard. Garantir que `appointments`, `barber_absences`, `guest_clients`, `notifications` têm policies restritivas. Idealmente bloquear leitura direta cliente-side se o app só fala via API routes.

### H4. Token guest é UUID v4 longa duração
**Arquivo:** `src/services/booking.ts` (geração) + `getGuestAppointmentsByToken`
**Achado:** Token é `crypto.randomUUID()`, sem expiração visível, armazenado plain no DB. Se vazar (log, screenshot), acesso permanente aos agendamentos.
**Como aplicar:** Hash do token no DB (bcrypt/sha256), TTL de 90 dias com renovação automática a cada acesso, rotação após cancelamento.

### H5. UI accessibility não auditada
**Achado:** Componentes em `src/components/booking/*` não foram validados quanto a `aria-*`, ordem de foco, contraste em dark mode.
**Como aplicar:** Rodar axe-core/Lighthouse sobre o fluxo de booking, corrigir gaps. Mínimo: WCAG AA.

### H6. Load test de concorrência ausente
**Achado:** Property-based tests em `booking.property.test.ts` cobrem lógica, mas advisory lock + partial index só são validados sob carga concorrente real. Sem k6/artillery.
**Como aplicar:** Cenário k6: 50 clientes tentando o mesmo slot simultaneamente — esperar 1 sucesso + 49 `SLOT_OCCUPIED`. Rodar contra staging.

### H7. Configuração de rate limit em prod
**Arquivo:** [src/lib/rate-limit.ts](src/lib/rate-limit.ts) (10 req/min appointments, 5 req/min guest)
**Achado:** Limites baixos podem bloquear legitimate users (cliente refazendo seleção). Sem bypass para barbeiros logados.
**Como aplicar:** Validar limites com staging traffic. Diferenciar buckets: barbeiro autenticado > cliente autenticado > guest > anônimo.

### H8. Timezone DST coverage
**Achado:** Brasil aboliu DST em 2019, mas se usuários viajarem ou se houver retorno do horário de verão, parsing pode quebrar em transições.
**Como aplicar:** Adicionar testes determinísticos para 2 datas-canários (3º domingo de outubro e fevereiro) usando `date-fns-tz` se disponível, ou `Intl.DateTimeFormat` com `America/Sao_Paulo`.

### H9. No-show automation
**Achado:** `markAppointmentAsNoShow` existe; não está claro se há job que marca automaticamente após X minutos do horário sem check-in.
**Como aplicar:** Adicionar à mesma infra de CRON (B3) job de no-show automático — ou explicitar que é manual.

---

## 🟢 NICE-TO-HAVE

- **N1.** Live availability via Supabase Realtime — outros usuários vendo slot ser tomado em tempo real.
- **N2.** Múltiplos serviços por agendamento (refactor com `AppointmentService` junction).
- **N3.** Confirmação 2FA para cancelamento via barbeiro (audit log já existe).
- **N4.** Webhook para integrações externas (calendar sync — Google Calendar do barbeiro).
- **N5.** Métricas de funnel: % seleção→confirmação, drop-off por etapa.

---

## ✅ O que está bem feito

- **Race condition:** advisory lock por `barber+date` + partial unique index `WHERE status='CONFIRMED'` permitindo rebook após cancel. Design correto. ([src/services/booking.ts:267-271](src/services/booking.ts))
- **Validação multi-camada:** shop hours → working hours → closures → absences (incl. recorrentes) → lead time. ([src/services/booking.ts:60-159](src/services/booking.ts))
- **Loyalty integrado em cancel/no-show** com feature flag. ([src/services/booking.ts:1664-1855](src/services/booking.ts))
- **Auditoria:** `add_appointment_audit_fields`, `add_admin_audit_logs` migrations presentes.
- **Phone normalization + history indexes** para guest re-access.
- **Cobertura de testes:** ~6.3k linhas, property-based em concorrência lógica.
- **CSRF/Origin** com Host header validation (OWASP). ([src/lib/api/verify-origin.ts](src/lib/api/verify-origin.ts))
- **Rate limit distribuído** com Upstash Redis (não in-memory, sobrevive a multi-instância).
- **Anti-enumeration** já tratado em commits recentes de auth.

---

## Checklist pré-go-live

- [ ] B1 — Validar Resend + deeplink WhatsApp manual em staging
- [ ] B2 — Validar Sentry + logger estruturado com requestId
- [ ] B3 — Validar execução do reminder via GitHub Actions
- [ ] B4 — Confirmar `appointments_unique_confirmed_slot` no Supabase prod
- [ ] H3 — Auditar RLS no Supabase dashboard
- [ ] H6 — Load test concorrência em staging
- [ ] H5 — Accessibility audit fluxo booking
- [ ] Validar rate limits (H7) com tráfego staging
- [ ] Documentar runbook de incidente (booking down, lembrete não disparou)
- [ ] Plano de rollback (`prisma migrate resolve`)

---

## Conclusão pragmática

**Código está bom.** Arquitetura de concorrência é sofisticada, validação rigorosa, testes substanciais. A stack free-tier já cobre o básico, mas **ainda pede validação operacional** antes de tráfego real:
1. Confirmar envs e entrega do Resend.
2. Confirmar captura no Sentry e logs correlacionados.
3. Confirmar execução do reminder via GitHub Actions.
4. Confirmar o índice crítico no Supabase prod.

Feito isso, o launch pode seguir; fase 2 paga fica só para automação WhatsApp de guest e hardening extra.
