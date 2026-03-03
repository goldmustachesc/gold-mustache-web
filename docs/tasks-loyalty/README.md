# Loyalty Program — Phases 3 to 7

Tasks para completar o sistema de fidelidade. Fases 1-6 estão implementadas. Fase 7 (refinamentos) pendente.

**Todas as tasks seguem metodologia TDD (Red → Green → Refactor).**

## Metodologia TDD

Cada task segue estritamente o ciclo:

```
RED ──────────────────────────────────────────────
  Escrever TODOS os testes primeiro.
  Testes definem o comportamento esperado.
  Rodar `pnpm test` → todos devem FALHAR.
  ↓
GREEN ────────────────────────────────────────────
  Implementar código MÍNIMO para passar os testes.
  Implementar função por função, rodando testes após cada uma.
  Rodar `pnpm test` → todos devem PASSAR.
  ↓
REFACTOR ─────────────────────────────────────────
  Limpar código sem alterar comportamento.
  Extrair constants, melhorar tipos, reduzir duplicação.
  Rodar `pnpm test` → deve continuar PASSANDO.
  `pnpm lint` ✅ e `pnpm build` ✅
```

### Stack de testes do projeto

| Ferramenta | Uso |
|------------|-----|
| **Vitest** | Test runner |
| **@testing-library/react** | Testes de componentes |
| **@testing-library/jest-dom** | Matchers DOM (`toBeInTheDocument`, etc.) |
| **@testing-library/user-event** | Interações de usuário |
| **fast-check** | Property-based testing |
| **happy-dom** | DOM environment |

### Convenções de teste

- **Localização:** `__tests__/` dentro do módulo testado
- **Nomenclatura:** `*.test.ts` / `*.test.tsx`, property tests: `*.property.test.ts`
- **Mocks Prisma:** `vi.mock("@/lib/prisma")` com apenas os models/methods usados
- **Mocks Auth:** `vi.mock("@/lib/supabase/server")` → `createClient().auth.getUser`
- **Mocks Admin:** `vi.mock("@/lib/auth/requireAdmin")` → `requireAdmin()`
- **Hooks com vi.hoisted:** Usar `vi.hoisted()` quando o mock é referenciado dentro de `vi.mock()`
- **Console:** Não permitir `console.error/warn` nos testes; spy e restore se necessário

### Comandos

```bash
pnpm test              # Rodar todos os testes
pnpm test:watch        # Watch mode (durante desenvolvimento TDD)
pnpm test:coverage:all # Coverage completo
pnpm test:gate         # Gate: lint + test + coverage checks
```

## Visão Geral

| # | Task | Fase | Prioridade | Deps | Testes | Status |
|---|------|------|------------|------|--------|--------|
| 001 | [Rewards Service (resgate + código)](./001-task-rewards-service-redemption.md) | 3 | 🔴 Alta | — | Unit + property | ✅ |
| 002 | [Endpoints de resgate (cliente + admin)](./002-task-redemption-api-endpoints.md) | 3 | 🔴 Alta | 001 | Route handler | ✅ |
| 003 | [Sistema de indicação (referral)](./003-task-referral-service-api.md) | 4 | 🟠 Alta | — | Unit + property + route | ✅ |
| 004 | [Fix mapeamento hooks ↔ API](./004-task-fix-loyalty-data-mapping.md) | 5 | 🔴 Crítica | — | Hook + component | ✅ |
| 005 | [Fix página de indicação](./005-task-fix-referral-page-ui.md) | 5 | 🟠 Alta | 003, 004 | Page + hook | ✅ |
| 006 | [UI resgates do cliente](./006-task-client-redemptions-ui.md) | 5 | 🟡 Média | 002 | Component + page + hook | ✅ |
| 007 | [Gestão de resgates (admin)](./007-task-admin-redemption-management.md) | 6 | 🟠 Alta | 001, 002 | Route + hook + UI | ✅ |
| 008 | [Relatórios de fidelidade (admin)](./008-task-admin-loyalty-reports.md) | 6 | 🟡 Média | — | Route + hook + UI | ✅ |
| 009 | [Fixes admin (tier + catálogo)](./009-task-admin-fixes-tier-catalog.md) | 6 | 🟠 Alta | — | Route + hook + UI | ✅ |
| 010 | [Fix referral apply flow](./010-task-fix-referral-apply-flow.md) | 4 | 🔴 Crítica | 003 | Route + hook + UI | ✅ |
| 011 | [Job expiração de pontos](./011-task-points-expiration-job.md) | 7 | 🟠 Alta | — | Service + route | 🔲 |
| 012 | [Job bônus de aniversário](./012-task-birthday-bonus-job.md) | 7 | 🟡 Média | — | Service + route | 🔲 |
| 013 | [Notificações de fidelidade](./013-task-loyalty-notifications.md) | 7 | 🟡 Média | 011, 012 | Service + integration | 🔲 |

## Ordem de execução recomendada

```
✅ CONCLUÍDO (Fases 3-6):
  001 → 002 → 006 → 007 ✅
  003 → 005 ✅
  004, 009 ✅
  008 ✅

PENDENTE:
  010 ✅ (fix referral apply — concluído)

  011 (expiração de pontos — pode iniciar imediatamente)
  012 (bônus aniversário — pode iniciar imediatamente)
    ↓
  013 (notificações — integra com todos os fluxos, incluindo 011 e 012)
```

**Próxima prioridade:** 011 + 012 (podem ser paralelizados) → 013 (integra com tudo)

## O que já existe (Fases 1-6)

- Schema Prisma: `LoyaltyAccount`, `PointTransaction`, `Reward`, `Redemption`
- Config: `src/config/loyalty.config.ts` com tiers, pontos, expiração
- Services: `loyalty.service.ts`, `points.calculator.ts`, `rewards.service.ts`, `referral.service.ts`
- APIs cliente: GET account, GET transactions, GET rewards, POST/GET redemptions, POST referral/validate
- APIs admin: GET accounts, POST adjust, CRUD rewards, toggle, POST redemptions/use, GET reports
- Hooks: `useLoyaltyAccount`, `useRewards`, `useRedeemReward`, `useLoyaltyTransactions`, `useRedemptions`, `useValidateReferral`
- Admin hooks: `useAdminLoyalty`, `useAdminRewards`, `useAdminRedemptions`, `useAdminLoyaltyReports`
- Componentes: `LoyaltyCard`, `TierBadge`, `TierProgress`, `RewardCard`, `RewardModal`, `RewardForm`, `RedemptionCode`
- Páginas cliente: dashboard, rewards, history, referral, redemptions
- Página admin: loyalty (tabs: Contas, Catálogo, Resgates, Relatórios)
- Integração: pontos creditados automaticamente no `markAppointmentAsCompleted`
- Testes cobrindo services, routes, hooks, components e pages

## Bugs/gaps conhecidos

1. **`applyReferral` nunca chamado** — validate endpoint não persiste `referredById` → Task 010
2. **Pontos não expiram** — sem job de expiração → Task 011
3. **Bônus de aniversário não implementado** — sem job de crédito → Task 012
4. **Notificações de fidelidade não disparam** — enum existe mas nunca usado → Task 013
