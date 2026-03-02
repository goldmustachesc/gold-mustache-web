# Loyalty Program — Phases 3 to 6

Tasks para completar o sistema de fidelidade. Fases 1-2 (schema, config, services core, APIs base) já estão implementadas.

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

| # | Task | Fase | Prioridade | Deps | Testes |
|---|------|------|------------|------|--------|
| 001 | [Rewards Service (resgate + código)](./001-task-rewards-service-redemption.md) | 3 | 🔴 Alta | — | Unit + property |
| 002 | [Endpoints de resgate (cliente + admin)](./002-task-redemption-api-endpoints.md) | 3 | 🔴 Alta | 001 | Route handler |
| 003 | [Sistema de indicação (referral)](./003-task-referral-service-api.md) | 4 | 🟠 Alta | — | Unit + property + route |
| 004 | [Fix mapeamento hooks ↔ API](./004-task-fix-loyalty-data-mapping.md) | 5 | 🔴 Crítica | — | Hook + component |
| 005 | [Fix página de indicação](./005-task-fix-referral-page-ui.md) | 5 | 🟠 Alta | 003, 004 | Page + hook |
| 006 | [UI resgates do cliente](./006-task-client-redemptions-ui.md) | 5 | 🟡 Média | 002 | Component + page + hook |
| 007 | [Gestão de resgates (admin)](./007-task-admin-redemption-management.md) | 6 | 🟠 Alta | 001, 002 | Route + hook + UI |
| 008 | [Relatórios de fidelidade (admin)](./008-task-admin-loyalty-reports.md) | 6 | 🟡 Média | — | Route + hook + UI |
| 009 | [Fixes admin (tier + catálogo)](./009-task-admin-fixes-tier-catalog.md) | 6 | 🟠 Alta | — | Route + hook + UI |

## Ordem de execução recomendada

```
Paralelo A (Backend):        Paralelo B (Fixes):
  001 → 002 → 007              004 (pode iniciar imediatamente)
       ↘ 006                   009 (pode iniciar imediatamente)
  003 → 005

Independente:
  008 (reports — pode ser feito a qualquer momento)
```

**Caminho crítico:** 001 → 002 → 006/007 (desbloqueia o fluxo completo de resgate)

## O que já existe (Fases 1-2)

- Schema Prisma: `LoyaltyAccount`, `PointTransaction`, `Reward`, `Redemption`
- Config: `src/config/loyalty.config.ts` com tiers, pontos, expiração
- Services: `loyalty.service.ts` (create, credit, debit, recalculate), `points.calculator.ts`
- APIs cliente: GET account, GET transactions, GET rewards
- APIs admin: GET accounts, POST adjust, CRUD rewards, toggle reward
- Hooks: `useLoyaltyAccount`, `useRewards`, `useRedeemReward`, `useLoyaltyTransactions`
- Componentes: `LoyaltyCard`, `TierBadge`, `TierProgress`, `RewardCard`, `RewardModal`, `RewardForm`
- Páginas cliente: dashboard, rewards, history, referral
- Página admin: loyalty (tabs: Contas, Catálogo)
- Integração: pontos creditados automaticamente no `markAppointmentAsCompleted`
- **57 testes existentes** cobrindo services, routes, components e hooks

## Bugs conhecidos documentados nas tasks

1. **Hook espera `points`, API retorna `currentPoints`** → Task 004
2. **Referral page usa `account.id` em vez de `referralCode`** → Task 004/005
3. **Admin adjust não recalcula tier** → Task 009
4. **Admin catálogo só mostra rewards ativos** → Task 009
5. **Rewards page tem mock fallback mascarando erros** → Task 004
