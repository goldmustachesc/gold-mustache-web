# Gate: GitHub Actions CI

**Data:** 2026-03-20
**Branch:** staging
**Commit:** bcfb711
**Resultado:** PASS (completed / success)
**Run ID:** 23355795305
**URL:** https://github.com/goldmustachesc/gold-mustache-web/actions/runs/23355795305

## Histórico recente

| Commit | Status | Data |
|--------|--------|------|
| `bcfb711` — docs: evidência de smoke automatizado | ✅ success | 2026-03-20T17:55Z |
| `3abe8a4` — docs: atualiza evidências do gate | ✅ success | 2026-03-20T02:16Z |
| `aef97ff` — fix(tests): corrige falhas de CI | ✅ success | 2026-03-20T00:52Z |
| `5791c8c` — feat: enhance test coverage config | ❌ failure | 2026-03-19T23:12Z |
| `222835e` — feat: add penalty for no-show | ✅ success | 2026-03-16T21:30Z |

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
