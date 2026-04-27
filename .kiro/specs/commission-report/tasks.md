# Plano de Implementação — Commission Report

Metodologia: **TDD** (RED → GREEN → REFACTOR) em cada task com entregável de código. Ordem respeita dependências (cálculo puro → schema → service → rotas → UI → exports → flag).

## Fase 0 — Fundação

- [ ] 0.1 Adicionar flag `commissionReport` em `src/config/feature-flags.ts` (default `false`, clientSafe `true`, category `financial`).
  - Teste: `src/services/__tests__/feature-flags.test.ts` valida registro e override por env.
  - _Requirements: 8_
- [ ] 0.2 Criar tipos em `src/types/commission.ts` (`CommissionPeriod`, `CommissionBarberReport`, `CommissionConsolidatedReport`, `AuditEntry`).
  - Proibido `any`; serialização `Decimal` → string documentada.
  - _Requirements: 2, 3_

## Fase 1 — Lógica de Cálculo (Pure)

- [ ] 1.1 [RED] Escrever `src/lib/commission/__tests__/calculate.test.ts` cobrindo:
  - rate 0 (comissão 0, casa = gross)
  - rate 100 / 1.0 (comissão = gross, casa 0)
  - rate 50 com 3 appointments (valores exatos em `Decimal`)
  - `rows = []` → tudo zero
  - múltiplas taxas no mesmo período (verifica snapshot por appointment)
  - preservação de precisão: 0.3333 * 100 BRL somado 3x ≠ 100 (documenta arredondamento apenas na borda)
  - _Requirements: 2, 3, 4_
- [ ] 1.2 [GREEN] Implementar `src/lib/commission/calculate.ts` (`computeCommission`) usando `Decimal.prototype` (sem `Number`).
- [ ] 1.3 [REFACTOR] Extrair `sumDecimals` helper se necessário; garantir cobertura ≥ 95%.

## Fase 2 — Schema e Migration

- [ ] 2.1 Editar `prisma/schema.prisma`:
  - `Barber.commissionRate Decimal @default(0.5) @db.Decimal(5,4)`
  - `Appointment.commissionRateSnapshot Decimal? @db.Decimal(5,4)` + índice `@@index([barberId, status, date])`
  - Novo model `BarberCommissionAudit`
  - `BarbershopSettings.defaultCommissionRate Decimal @default(0.5) @db.Decimal(5,4)`
  - _Requirements: 1, 4, 9_
- [ ] 2.2 Rodar `pnpm prisma migrate dev --name add_commission_report` e validar migration SQL (backfill incluso).
- [ ] 2.3 Seed de teste: atualizar `prisma/seed.ts` com `commissionRate` distintos por barbeiro.
- [ ] 2.4 Teste de integração (vitest + prisma test db): migration aplica e backfill preenche snapshot em `COMPLETED` antigos.

## Fase 3 — Serviço de Comissão

- [ ] 3.1 [RED] `src/services/financial/__tests__/commission.test.ts`:
  - `getBarberCommissionReport` com mês sem appointments → zeros
  - cálculo correto com fixtures determinísticas
  - exclui `CANCELLED_BY_CLIENT|CANCELLED_BY_BARBER|NO_SHOW`
  - usa `commissionRateSnapshot`, não `barber.commissionRate` atual
  - período trimestre cobre 3 meses inclusive
  - timezone `America/Sao_Paulo` no boundary de dia
  - _Requirements: 2, 3, 4, 5, 7_
- [ ] 3.2 [GREEN] `src/services/financial/commission.ts`:
  - `resolvePeriodRange(period)`
  - `getBarberCommissionReport`
  - `getConsolidatedCommissionReport` (com orderBy)
  - `captureCommissionSnapshot(appointmentId)` (idempotente)
  - `updateBarberCommissionRate` (transação + audit)
  - `getBarberCommissionHistory` (paginado)
- [ ] 3.3 Integrar `captureCommissionSnapshot` na transição para `COMPLETED` em `src/services/booking.ts` (e no endpoint admin de mudança de status). Teste: appointment passa a `COMPLETED` e snapshot é gravado; idempotência verificada.
  - _Requirements: 4_

## Fase 4 — Rotas API

- [ ] 4.1 [RED] Teste de contrato `src/app/api/admin/financial/commission/__tests__/route.test.ts`:
  - 401 sem auth, 403 não-admin, 404 com flag off
  - 400 com `month` e `quarter` simultâneos
  - 200 consolidado / 200 por barbeiro
  - `Decimal` serializado como string
  - _Requirements: 2, 3, 5, 8_
- [ ] 4.2 [GREEN] `src/app/api/admin/financial/commission/route.ts` (GET com `format=json|pdf|csv`). Zod + RBAC + flag guard.
- [ ] 4.3 [RED] Testes para `PATCH /api/admin/barbers/[id]/commission`: validação (rate 0–100), auditoria criada, flag guard.
  - _Requirements: 1, 8, 9_
- [ ] 4.4 [GREEN] Implementar `src/app/api/admin/barbers/[id]/commission/route.ts`.
- [ ] 4.5 [RED] Testes para `GET /api/admin/barbers/[id]/commission/history` (paginação, ordenação desc).
- [ ] 4.6 [GREEN] Implementar `src/app/api/admin/barbers/[id]/commission/history/route.ts`.

## Fase 5 — UI: Configuração de Rate por Barbeiro

- [ ] 5.1 [RED] Teste do componente `CommissionSettings` (Vitest + Testing Library):
  - validação de input (aceita 0–100)
  - chama PATCH com valor correto
  - exibe histórico após salvar
  - mostra erro do backend em pt-BR
- [ ] 5.2 [GREEN] `src/components/financial/CommissionSettings.tsx` + integração em `src/app/[locale]/(protected)/admin/barbeiros/[id]/page.tsx`.
- [ ] 5.3 Acessibilidade: labels, `aria-invalid`, foco em erro. Dark/Light mode via tokens `globals.css`.

## Fase 6 — UI: Relatório

- [ ] 6.1 [RED] Testes de `CommissionTab`, `CommissionSummaryCards`, `CommissionTable` (render com dados, estados zero, ordenação).
- [ ] 6.2 [GREEN] Implementar componentes em `src/components/financial/`.
- [ ] 6.3 Integrar como nova aba em `src/components/financial/FinancialPage.tsx` (ou criar subpágina `/admin/faturamento/comissoes/page.tsx` se a aba ficar pesada). Guard por `useFeatureFlag("commissionReport")`.
- [ ] 6.4 Estados: loading (skeleton), vazio ("Sem atendimentos concluídos no período"), erro (toast + retry).
  - _Requirements: 2, 3, 7, 8_

## Fase 7 — Export PDF

- [ ] 7.1 [RED] Teste `src/lib/pdf/__tests__/commission-report.test.ts`: gera Uint8Array não vazio com seções esperadas (mock de jsPDF).
- [ ] 7.2 [GREEN] `src/lib/pdf/commission-report.ts` reutilizando palette/tipografia de `financial-report.ts`. Inclui cabeçalho com nota "Apenas atendimentos concluídos".
- [ ] 7.3 Botão "Exportar PDF" no `CommissionTab` dispara `GET …?format=pdf` e aciona `downloadBlob`.
  - _Requirements: 6, 7_

## Fase 8 — Export CSV

- [ ] 8.1 [RED] Teste `src/lib/csv/__tests__/commission-report.test.ts`: BOM, separador `;`, escape de `"`, linha TOTAL.
- [ ] 8.2 [GREEN] `src/lib/csv/commission-report.ts` (sem libs externas; função pura).
- [ ] 8.3 Route handler retorna `text/csv; charset=utf-8` com `Content-Disposition: attachment`.
- [ ] 8.4 LGPD: lint-style check manual e comentário de bloco confirmando ausência de PII.
  - _Requirements: 6_

## Fase 9 — Flag e Rollout

- [ ] 9.1 Verificar guards de flag em todos os 3 endpoints (404 quando off). Teste end-to-end com flag off.
- [ ] 9.2 Esconder aba na UI e menu admin quando flag off (`useClientFeatureFlag`).
- [ ] 9.3 Documentar no README interno (`docs/commission-report.md` apenas se solicitado pelo PO).
  - _Requirements: 8_

## Fase 10 — Gate Final

- [ ] 10.1 `pnpm lint` limpo (Biome).
- [ ] 10.2 `pnpm test:gate` passa (cobertura ≥ 85% em `lib/commission` e `services/financial/commission`).
- [ ] 10.3 Smoke manual: admin altera rate, gera relatório mês, exporta PDF e CSV, verifica histórico de auditoria.
- [ ] 10.4 Commit Conventional: `feat(commission): add commission report with per-barber split and audit trail`.

## Edge Cases Cobertos por Teste

1. Rate 0 e Rate 100.
2. Mês sem appointments.
3. Mês com todos cancelados/NO_SHOW.
4. Mistura de status (apenas COMPLETED conta).
5. Mudança de rate no meio do mês (snapshot respeita momento do COMPLETED).
6. Período no futuro (retorna zeros).
7. Appointment legado sem snapshot (fallback + warning).
8. Trimestre cruzando ano (ex.: futuro Q1 2027 — válido; Q4 2025 válido).
9. Precisão: 3× (100 × 0.3333) = 99.99, não 100 — documenta comportamento.
10. Auditoria preserva ordem mesmo com alterações no mesmo segundo (tiebreak por `id`).
