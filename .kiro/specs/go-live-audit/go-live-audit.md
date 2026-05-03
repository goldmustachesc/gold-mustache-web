# Go Live Audit — Gold Mustache Booking System
**Data da auditoria:** 2026-05-02
**Branch:** staging
**Veredicto geral:** ⚠️ PRECISA DE AJUSTES — não bloqueado por lógica de negócio, mas há gaps operacionais e de segurança que devem ser resolvidos antes do lançamento.

---

## Resumo Executivo

| Área | Veredicto | Resumo |
|------|-----------|--------|
| **Double booking** | ✅ BAIXO RISCO | 3 camadas de defesa (advisory lock + partial unique index + overlap check). Sólido. |
| **Segurança / Auth** | ⚠️ GO COM CONDIÇÕES | 3 itens HIGH que precisam de ação antes do Go Live |
| **UX / Operacional** | ⚠️ PRECISA DE AJUSTES | 4 itens CRÍTICOS, todos de baixo esforço de correção |

---

## ÁREA 1: Double Booking — BAIXO RISCO ✅

A preocupação central do sistema está **bem implementada com defesa em profundidade**:

1. **Advisory lock por transação** (`src/services/booking.ts:220-232`) — serializa todas as escritas para o mesmo barbeiro+dia. Elimina a race condition de leitura-modificação-escrita.
2. **Partial unique index no DB** (`prisma/migrations/.../migration.sql:14`) — `UNIQUE ON (barber_id, date, start_time) WHERE status = 'CONFIRMED'`. Permite rebook após cancelamento.
3. **Overlap check dentro da transação** (`src/services/booking.ts:257-290`) — intervalo correto `A < D AND C < B`, filtra apenas CONFIRMED.
4. **P2002 fallback** (`src/app/api/appointments/route.ts:256-261`) — retorna 409 `SLOT_OCCUPIED` como última linha de defesa.

### Gaps (baixa prioridade)

| # | Severidade | Arquivo | Detalhe |
|---|-----------|---------|---------|
| 1 | LOW | `booking.ts:798` vs `:812` | Policy check (ausências, horário) executa **fora** da transação. Janela de ~ms. |
| 2 | LOW | DB schema | Partial unique só protege mesmo `start_time`. Serviços de duração variável só são protegidos pelo lock+overlap check. Se alguém bypassar o service layer via SQL direto, o DB não pega overlaps. |
| 3 | MEDIUM | `booking.ts:111-114` | Verificar se `BarberAbsenceRecurrence` é materializado em `BarberAbsence`. Se recorrências não forem materializadas, booking pode cair em folga recorrente. |

**Recomendação:** Verificar se existe job que expande recorrências de ausência para registros concretos de `BarberAbsence`.

---

## ÁREA 2: Segurança / Auth — GO COM CONDIÇÕES ⚠️

### BLOQUEADORES PRÉ-LAUNCH (HIGH)

**H1. Rate limiter em memória sem Redis em produção**
- `src/lib/rate-limit.ts:64-107` — se `UPSTASH_REDIS_REST_URL` não estiver configurado na Vercel, o limiter degradatumbles para Map por-processo. Com múltiplas instâncias, o rate limit efetivo multiplica por N instâncias.
- **Ação:** Verificar que env vars do Upstash estão configuradas em produção.

**H2. Guest token em `localStorage` — vulnerável a XSS**
- `src/lib/guest-session.ts:33` — token armazenado no localStorage. Qualquer XSS no domínio pode exfiltrar.
- **Ação ideal:** Migrar para cookie HttpOnly + Secure + SameSite=Lax. **Pós-launch aceitável** se o prazo for curto, mas documentar o risco.

**H3. IDOR em rebooking de guest — CRÍTICO**
- `src/services/booking.ts:1014-1028` — ao fazer novo agendamento com o mesmo telefone, o `upsert` **sobrescreve** o `accessToken` do `guestClient`. O atacante que conhece o telefone da vítima pode rebook, receber o novo token e cancelar agendamentos futuros da vítima.
- **Ação obrigatória pré-launch:** Não sobrescrever `accessToken` no upsert. Opção mais segura: token por agendamento, não por guest.

### Pós-launch (MEDIUM)

- M4: Sem limite máximo de data no agendamento (usuário pode agendar anos no futuro)
- M5: Cancel retorna NOT_FOUND vs UNAUTHORIZED separados (enumeração de IDs)
- M3: Phone incluído por padrão em respostas de agendamento
- M1: Profile criado de `user_metadata` sem re-validar telefone

---

## ÁREA 3: UX / Operacional — PRECISA DE AJUSTES ⚠️

### BLOQUEADORES PRÉ-LAUNCH (CRÍTICO)

**C1. Cron de lembretes NÃO está agendado na Vercel**
- `vercel.json` não tem entrada para `/api/cron/appointment-reminders`
- O handler existe e funciona (`src/app/api/cron/appointment-reminders/route.ts`) mas nunca será chamado
- **Ação:** Adicionar ao `vercel.json` antes do launch. Se não quiser lembretes no lançamento, ao menos documentar.

**C2. Cron de limpeza LGPD NÃO está agendado**
- `src/app/api/cron/cleanup-guests/route.ts` existe mas não está em `vercel.json`
- Obrigação LGPD começa no Go Live
- **Ação:** Adicionar ao `vercel.json`.

**C3. Sem `global-error.tsx` no App Router**
- Apenas `src/app/[locale]/error.tsx` existe. Sem `app/global-error.tsx`
- Erro no root layout = tela branca em produção
- **Ação:** Criar `src/app/global-error.tsx` com fallback genérico.

**C4. Copy incorreto no BookingConfirmation sobre cancelamento**
- `src/components/booking/BookingConfirmation.tsx:108-111` diz: "Você pode cancelar a qualquer momento"
- Realidade: sistema bloqueia cancelamento com menos de 2h de antecedência (`src/app/api/appointments/[id]/cancel/route.ts:203-208`)
- **Ação obrigatória:** Corrigir para "Cancelamento permitido até 2 horas antes do horário."

### HIGH

**H4. `notifyAppointmentConfirmed` não tem `.catch` em appointments/route.ts**
- `src/app/api/appointments/route.ts:190` — se a notificação falhar, o POST retorna 500 mesmo com agendamento já criado. Usuário vê erro mas o agendamento foi feito.
- **Ação:** `await notifyAppointmentConfirmed(...).catch(err => logger.warn(err))`

**H5. Cancelamento sem dialog de confirmação**
- `src/hooks/useAppointmentActions.ts:26-47` — toque único cancela imediatamente
- **Ação:** Adicionar AlertDialog de confirmação.

**H6. Sem email/SMS de confirmação para guests**
- Guests recebem apenas `BookingConfirmation` na tela. Sem confirmação fora do app.
- Se fechar a aba, não têm registro do agendamento (exceto pelo localStorage).
- **Ação:** Enviar email transacional de confirmação (feature flag já existe: `transactionalEmails`).

**H7. WhatsApp reminders são manuais (barbeiro clica no link)**
- `src/services/appointment-reminders.ts:211-227` cria notificação com `wa.me` deeplink para o **barbeiro** clicar. Não é automático.
- **Ação:** Alinhar expectativa com stakeholders antes do lançamento.

---

## Checklist de Go Live (1 semana)

### Obrigatório antes de lançar

- [ ] **C4** — Corrigir copy do BookingConfirmation (2h)
- [ ] **C3** — Criar `src/app/global-error.tsx`
- [ ] **C1+C2** — Adicionar crons ao `vercel.json`
- [ ] **H3 (Security)** — Corrigir IDOR do guest token no rebook
- [ ] **H1 (Security)** — Verificar Upstash Redis configurado em produção
- [ ] **H4** — Wrap `notifyAppointmentConfirmed` em `.catch`
- [ ] **H5** — Adicionar dialog de confirmação no cancelamento
- [ ] **Env vars** — `FEATURE_FLAG_APPOINTMENT_REMINDERS`, `FEATURE_FLAG_TRANSACTIONAL_EMAILS`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` configurados na Vercel
- [ ] **Smoke test** — iOS Safari (layout `dvh`)
- [ ] **pnpm audit --prod** — resolver HIGH/CRITICAL de dependências

### Alta prioridade (primeiras 2 semanas pós-launch)

- [ ] H6 — Email de confirmação para guests
- [ ] H2 — Migrar guest token para HttpOnly cookie
- [ ] M4 — Limite máximo de data no agendamento
- [ ] Verificar materialização de `BarberAbsenceRecurrence`
- [ ] Verificar admin cancel route bypassa bloqueio de 2h

### Opcional / niceness

- [ ] Dialog de "Adicionar ao Google Calendar" na confirmação
- [ ] Idempotency key no POST de agendamento (previne double-click → 409)
- [ ] Mascarar telefone em respostas de API

---

## Conclusão

O sistema **pode ir ao ar** com os ajustes obrigatórios acima. A lógica central de **double booking está bem protegida** — esse era o maior risco e está resolvido corretamente. Os bloqueadores são itens de configuração e pequenas correções de código, todos de baixo esforço. Com ~2-3 dias de trabalho focado, o sistema estará pronto para produção com segurança razoável.
