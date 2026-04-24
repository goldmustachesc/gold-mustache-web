# Plano de Implementação — loyalty-bugfix-audit

Ordem TDD obrigatória: RED → GREEN → REFACTOR. Itens marcados com `(P)` podem rodar em paralelo com outros `(P)` do mesmo grupo. Zero `any`; Biome + Vitest limpos antes de fechar cada bloco.

## Bloco 1 — Bug R1: Gate de feature flag em `markAppointmentAsNoShow`

- [ ] 1.1 Escrever teste (RED): cenário onde `loyaltyProgram=false` executa `markAppointmentAsNoShow` e espera zero chamadas a `LoyaltyService.penalizePoints`
- [ ] 1.2 Escrever teste (RED): cenário onde `loyaltyProgram=true` mantém o crédito de penalidade atual (regressão)
- [ ] 1.3 Escrever teste (RED): exceção ao ler a flag não interrompe o retorno do appointment atualizado
- [ ] 1.4 Implementar gate em `src/services/booking.ts:1600-1622` — import dinâmico de `isFeatureEnabled("loyaltyProgram")` e early-return do bloco de penalidade
- [ ] 1.5 Rodar `pnpm test src/services/__tests__/booking-noshow.test.ts` e `pnpm test src/app/api/appointments/[id]/__tests__/no-show.route.test.ts` — todos verdes
- [ ] 1.6 Refactor: extrair helper `shouldApplyLoyalty()` se já houver duplicação com `markAppointmentAsCompleted`
- _Requirements: R1.1, R1.2, R1.3, R1.4_

## Bloco 2 — Bug R2: Ícones/labels do extrato

- [ ] 2.1 Escrever teste de componente (RED) cobrindo os 10 valores do `PointTransactionType` + caso `ADJUSTED` com points positivos e negativos, verificando ícone + label
- [ ] 2.2 Escrever teste (RED) para valor fora do enum (defensivo) — retorna valor cru + `console.warn`
- [ ] 2.3 Atualizar `src/i18n/locales/pt-BR/loyalty.json > history.types` cobrindo todos os 10 valores do enum (EARNED_APPOINTMENT, EARNED_REFERRAL, EARNED_REVIEW, EARNED_CHECKIN, EARNED_BIRTHDAY, EARNED_BONUS, REDEEMED, EXPIRED, ADJUSTED, PENALTY_NO_SHOW) `(P)`
- [ ] 2.4 Mesmo para `src/i18n/locales/en/loyalty.json` `(P)`
- [ ] 2.5 Mesmo para `src/i18n/locales/es/loyalty.json` `(P)`
- [ ] 2.6 Reescrever `getTypeIcon` e `getTypeLabel` em `src/app/[locale]/(protected)/loyalty/history/page.tsx:22-32` conforme design A2 (sets + fallback por sinal para ADJUSTED)
- [ ] 2.7 Tipar `tx.type` como `PointTransactionType` importado de `@prisma/client`, eliminar `string` nas props do map
- [ ] 2.8 Rodar testes — verdes
- _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5_

## Bloco 3 — Bug R3: `EARNED_CHECKIN` expira

- [ ] 3.1 Escrever teste (RED) em `src/services/loyalty/__tests__/expiration.service.test.ts` seedando uma `PointTransaction` `EARNED_CHECKIN` com `expiresAt < now` e verificando que `expirePoints` gera `EXPIRED` correspondente
- [ ] 3.2 Escrever teste (RED): `getExpiringTransactions` retorna `EARNED_CHECKIN` dentro da janela de warning
- [ ] 3.3 Adicionar `PointTransactionType.EARNED_CHECKIN` em `EXPIRABLE_TYPES` (`src/services/loyalty/expiration.service.ts:7-13`)
- [ ] 3.4 Confirmar no schema (`prisma/schema.prisma:466`) que a constraint `@@unique([referenceId, type])` permanece e que crédito de `EARNED_CHECKIN` já preenche `expiresAt`
- [ ] 3.5 Rodar testes — verdes
- _Requirements: R3.1, R3.2, R3.3, R3.4_

## Bloco 4 — Bug R4: UI de referral com bônus correto

- [ ] 4.1 Escrever teste de componente (RED) em `src/app/[locale]/(protected)/loyalty/referral/__tests__/page.test.tsx` verificando que a página exibe dois valores distintos: `REFERRAL_BONUS=150` (indicante) e `FIRST_APPOINTMENT_BONUS=50` (indicado)
- [ ] 4.2 Escrever teste (RED) para a mensagem de sucesso de `applyReferral` mencionando `FIRST_APPOINTMENT_BONUS`
- [ ] 4.3 Atualizar `src/i18n/locales/pt-BR/loyalty.json > referral`: substituir chave `description` por `bonusReferrer` + `bonusReferred` + ajustar `referralApplied` para citar `{points}` do indicado `(P)`
- [ ] 4.4 Mesmo para `src/i18n/locales/en/loyalty.json` `(P)`
- [ ] 4.5 Mesmo para `src/i18n/locales/es/loyalty.json` `(P)`
- [ ] 4.6 Atualizar `src/app/[locale]/(protected)/loyalty/referral/page.tsx:78-81` para renderizar os dois textos com os valores corretos de `LOYALTY_CONFIG.REFERRAL_BONUS` e `LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS`
- [ ] 4.7 Rodar testes — verdes
- _Requirements: R4.1, R4.2, R4.3, R4.4, R4.5_

## Bloco 5 — Audit R5.1-5.3: Migration + service + masking

- [ ] 5.1 Escrever teste (RED) para `maskPII` em `src/services/__tests__/admin-audit.utils.test.ts` cobrindo PII keys (`phone`, `email`, `document`, `cpf`, `cnpj`, `rg`, `zipCode`, `birthDate`, `password`, `passwordHash`, `token`), aninhamento em objetos, arrays, preservação de chaves não-PII
- [ ] 5.2 Escrever teste (RED) para `maskIp` (IPv4 mascara últimos 2 octetos; IPv6 preserva; null preserva)
- [ ] 5.3 Implementar `src/services/admin-audit.utils.ts` com `maskPII<T>(value: T): T` e `maskIp(raw: string | null): string | null` — zero `any`, usar `unknown` + narrowing
- [ ] 5.4 Adicionar ao `prisma/schema.prisma`: modelo `AdminAuditLog` e enum `AdminAuditAction` conforme B1 (campos, índices, @@map, relação com Profile)
- [ ] 5.5 Rodar `pnpm prisma migrate dev --name add_admin_audit_log` e commitar SQL gerado
- [ ] 5.6 Escrever teste (RED) para `AdminAuditService.log` usando mock Prisma: cria registro com campos corretos, mascarando PII do payload, lendo headers do `Request`
- [ ] 5.7 Implementar `src/services/admin-audit.service.ts` com `log()` fire-and-forget (try/catch interno, `console.error` em falha)
- [ ] 5.8 Rodar testes — verdes
- _Requirements: R5.1, R5.2, R5.3, R5.4_

## Bloco 6 — Audit R5.5-5.7: Wrapper `withAuditLog`

- [ ] 6.1 Escrever teste (RED) em `src/app/api/admin/_audit/__tests__/withAuditLog.test.ts`: handler retorna 2xx → `AdminAuditService.log` é chamado 1 vez
- [ ] 6.2 Escrever teste (RED): handler retorna 4xx/5xx → `log` NÃO é chamado
- [ ] 6.3 Escrever teste (RED): falha em `log` NÃO propaga para o response original
- [ ] 6.4 Escrever teste (RED): `requireAdmin()` falha → retorna 401/403 e NÃO chama `log`
- [ ] 6.5 Escrever teste (RED): `extractResourceId` e `extractPayload` recebem o body parseado
- [ ] 6.6 Implementar `src/app/api/admin/_audit/withAuditLog.ts` conforme B3 (usar `response.clone()` para preservar corpo)
- [ ] 6.7 Rodar testes — verdes
- _Requirements: R5.5, R5.6, R5.7_

## Bloco 7 — Aplicação do wrapper nas rotas de rewards (R5.8)

- [ ] 7.1 Escrever teste de integração (RED) em `src/app/api/admin/loyalty/rewards/__tests__/route.test.ts`: POST criar reward dispara audit com `action=REWARD_CREATE`
- [ ] 7.2 Escrever teste (RED): PATCH em `[id]/route.ts` dispara `REWARD_UPDATE`; DELETE dispara `REWARD_DELETE`; toggle dispara `REWARD_TOGGLE`
- [ ] 7.3 Envolver handlers com `withAuditLog` em `src/app/api/admin/loyalty/rewards/route.ts`, `.../[id]/route.ts`, `.../[id]/toggle/route.ts`
- [ ] 7.4 Remover linhas `console.info("[AUDIT] ...")` das mesmas rotas (já cobertas pelo wrapper)
- [ ] 7.5 Rodar testes — verdes
- _Requirements: R5.8_

## Bloco 8 — API de listagem paginada `/api/admin/audit` (R6.1-R6.3, R6.8)

- [ ] 8.1 Escrever teste (RED) em `src/app/api/admin/audit/__tests__/route.test.ts` para GET sem auth → 401/403
- [ ] 8.2 Escrever teste (RED) para paginação (default 50, pageSize máx 100, page mínimo 1)
- [ ] 8.3 Escrever teste (RED) para filtros combinados `from`/`to`/`adminId`/`action`/`resourceType`
- [ ] 8.4 Escrever teste (RED) para Zod rejeitar query inválida (datas não-ISO, enum fora, uuid inválido)
- [ ] 8.5 Escrever teste (RED): resposta inclui `items[].actor.fullName` e `items[].ip` já mascarado
- [ ] 8.6 Implementar `src/app/api/admin/audit/route.ts` (GET) com Zod + `AdminAuditService.list`
- [ ] 8.7 Adicionar método `list` ao `AdminAuditService` com filtros e paginação (`Prisma.findMany` + `count` em paralelo via `Promise.all`)
- [ ] 8.8 Rodar testes — verdes
- _Requirements: R6.1, R6.2, R6.3, R6.8_

## Bloco 9 — UI `/admin/auditoria` (R6.1, R6.4-R6.7)

- [ ] 9.1 Criar hook `src/hooks/useAdminAuditLogs.ts` com TanStack Query, `keepPreviousData: true`, query key derivada dos filtros `(P)`
- [ ] 9.2 Escrever teste (RED) do hook — chamada a `/api/admin/audit` com query string correta `(P)`
- [ ] 9.3 Criar `src/app/[locale]/(protected)/admin/auditoria/page.tsx` (Server Component) lendo searchParams e passando para o client `(P)`
- [ ] 9.4 Criar `src/components/admin/audit/AuditLogTable.tsx` (Client) com shadcn/ui `Table`, colunas conforme R6.1, ip mascarado, link "ver payload"
- [ ] 9.5 Criar `src/components/admin/audit/AuditFilterBar.tsx` com date range, select de admin (alimentado por `/api/admin/profiles`), select de action (enum `AdminAuditAction`), input de resourceType
- [ ] 9.6 Criar `src/components/admin/audit/AuditPayloadDialog.tsx` com `Dialog` + `<pre>` para JSON formatado
- [ ] 9.7 Implementar deep-link (URL ↔ filtros) via `router.replace(new URL(...))`
- [ ] 9.8 Empty state "Nenhum registro encontrado" quando `items.length === 0`
- [ ] 9.9 Botão "Limpar filtros" que reseta URL
- [ ] 9.10 Garantir proteção via `requireAdmin()` no layout/page server
- [ ] 9.11 Adicionar item no menu admin (`src/components/admin/**` navegação) apontando para `/admin/auditoria`
- [ ] 9.12 Testes de componente para `AuditLogTable` (render com dados, render empty, ip mascarado, abrir modal)
- [ ] 9.13 Rodar testes — verdes
- _Requirements: R6.1, R6.4, R6.5, R6.6, R6.7_

## Bloco 10 — Documentação e i18n finais `(P)`

- [ ] 10.1 Adicionar chaves i18n em `src/i18n/locales/{pt-BR,en,es}/admin.json` para página `/admin/auditoria` (títulos, colunas, filtros, empty state, botão limpar) `(P)`
- [ ] 10.2 Atualizar `docs/auditoria-projeto-2026-04-15.md` marcando P2 #10, #11, #15 como resolvidos na entrega desta spec `(P)`
- [ ] 10.3 Documentar em `docs/ops/admin-audit-log.md` (breve): o que é logado, o que não é, retenção mínima, limitações do masking de PII `(P)`
- _Requirements: R5 (transversal), R6 (transversal)_

## Bloco 11 — Gate final

- [ ] 11.1 `pnpm test` — toda a suíte verde, sem regressão
- [ ] 11.2 `pnpm lint` — Biome limpo
- [ ] 11.3 `pnpm build` — build de produção passa
- [ ] 11.4 `pnpm test:gate` — coverage dentro do limite configurado
- [ ] 11.5 Verificar manualmente no staging: criar reward, editar, toggle, deletar → 4 registros em `admin_audit_logs` com payload mascarado
- [ ] 11.6 Verificar manualmente: `markAppointmentAsNoShow` com flag off não cria `PENALTY_NO_SHOW`
- [ ] 11.7 Conventional Commit (um por bloco lógico):
  - `fix(loyalty): respect loyaltyProgram flag in markAppointmentAsNoShow`
  - `fix(loyalty): correct type icons and labels in points history`
  - `fix(loyalty): include EARNED_CHECKIN in expirable point types`
  - `fix(loyalty): show correct referrer vs referred bonus in referral UI`
  - `feat(admin): persistent audit log with masked payload and admin UI`
