# Gate: GitHub Actions CI

**Data:** 2026-03-19
**Branch:** staging
**Commit:** aef97ff
**Resultado:** PASS (completed / success)
**Duração:** 9m 4s
**Run ID:** 23324214579

## Histórico recente

| Commit | Status | Duração |
|--------|--------|---------|
| `aef97ff` — fix(tests): corrige falhas de CI | ✅ success | 9m 4s |
| `5791c8c` — feat: enhance test coverage config | ❌ failure | 2m 30s |
| `222835e` — feat: add penalty for no-show | ✅ success | 7m 21s |

## O que o CI valida (`.github/workflows/ci.yml`)

- `pnpm test:gate` (lint + test + coverage:core + coverage:services + coverage:app-api)
- `pnpm build`

## Correções aplicadas nesta sessão

Dois testes falhavam apenas no CI por problemas de ambiente:

1. `src/config/__tests__/site.test.ts` — o CI injeta `NEXT_PUBLIC_SITE_URL=https://goldmustache.example`
   e o teste de fallback não limpava essa variável. Corrigido adicionando `delete process.env.NEXT_PUBLIC_SITE_URL`
   e `delete process.env.VERCEL_URL` no teste específico.

2. `src/components/dashboard/__tests__/BarberDashboard.test.tsx` — `parseDateString` criava
   data à meia-noite local, mas o CI roda em UTC. `formatIsoDateYyyyMmDdInSaoPaulo` interpretava
   meia-noite UTC como noite anterior em São Paulo (UTC-3), deslocando a data e quebrando os filtros.
   Corrigido mockando `parseDateString` para retornar meio-dia.

## Status: ✅ APROVADO
