# 009 - Corrigir recalculateTier no ajuste e catálogo admin

## Fase: 6 — Admin UI (Bug fixes)

## Prioridade: 🟠 ALTA (Integridade de dados)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

### Bug 1: Tier não recalculado após ajuste manual

O endpoint `POST /api/admin/loyalty/accounts/[accountId]/adjust` credita/debita pontos mas **não chama `recalculateTier()`**. Se o admin adiciona pontos suficientes para subir de tier (ex: Bronze → Prata), o tier fica desatualizado até a próxima transação automática.

**Impacto:** Cliente não recebe bônus de tier correto. Dashboard exibe tier errado.

### Bug 2: Catálogo admin só mostra rewards ativos

A page `admin/loyalty` usa o hook `useRewards` que chama `GET /api/loyalty/rewards` (endpoint público). Este endpoint filtra `active: true`. Resultado: o admin **não consegue ver rewards inativos** para reativá-los.

**Impacto:** Rewards desativados ficam inacessíveis para o admin.

## O que corrigir

### Para bug 1:
No endpoint de adjust (ou no service chamado), adicionar `LoyaltyService.recalculateTier(accountId)` após o ajuste de pontos.

```typescript
// Após creditPoints/debitPoints:
await LoyaltyService.recalculateTier(accountId);
```

### Para bug 2:
Opção A (preferível): Criar hook `useAdminRewards` que chama `GET /api/admin/loyalty/rewards` (já retorna todos).
Opção B: Adicionar query param `?includeInactive=true` no endpoint público (menos seguro).

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/admin/loyalty/accounts/[accountId]/adjust/__tests__/route.test.ts` | **Modificar PRIMEIRO** — adicionar teste de recalculateTier |
| `src/hooks/__tests__/useAdminRewards.test.tsx` | **Criar PRIMEIRO** — teste do hook admin |
| `src/app/[locale]/(protected)/admin/loyalty/__tests__/catalog-tab.test.tsx` | **Criar PRIMEIRO** — teste que verifica uso de hook correto |
| `src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts` | **Modificar** — adicionar `recalculateTier()` |
| `src/hooks/useAdminLoyalty.ts` ou `useAdminRewards.ts` | **Criar/Modificar** — hook admin rewards |
| `src/app/[locale]/(protected)/admin/loyalty/page.tsx` | **Modificar** — usar `useAdminRewards` |

## Dependências

- Nenhuma — são correções em código existente

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Bug 1: Testes do endpoint adjust — `adjust/__tests__/route.test.ts`

- [ ] Deve chamar `recalculateTier()` após creditPoints quando pontos são adicionados
- [ ] Deve chamar `recalculateTier()` após debitPoints quando pontos são removidos
- [ ] Response deve incluir o tier atualizado
- [ ] Quando ajuste cruza threshold (ex: 499→501), tier na response deve ser SILVER (não BRONZE)

#### Bug 2: Testes do hook admin — `useAdminRewards.test.tsx`

- [ ] `useAdminRewards` deve chamar `GET /api/admin/loyalty/rewards` (não a rota pública)
- [ ] Deve retornar rewards ativos E inativos

#### Bug 2: Testes da UI admin — `catalog-tab.test.tsx`

- [ ] Aba Catálogo deve renderizar rewards inativos (com visual diferenciado)
- [ ] Rewards inativos devem ter toggle para reativar
- [ ] Deve usar `useAdminRewards` (não `useRewards`)

- [ ] Rodar `pnpm test` → confirmar que testes novos falham (RED)

### Mocks necessários

```typescript
// Para teste do adjust
vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: {
    creditPoints: vi.fn(),
    debitPoints: vi.fn(),
    recalculateTier: vi.fn().mockResolvedValue("SILVER"),
  },
}));

// Para teste do hook
// Usar MSW ou mock do fetch para interceptar a chamada à rota admin

// Para teste da UI
vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminRewards: () => ({
    data: [...activeRewards, ...inactiveRewards],
    isLoading: false,
  }),
}));
```

### Fase GREEN — Implementar correções mínimas para passar

- [ ] Adicionar `recalculateTier()` no handler de adjust após alteração de pontos
- [ ] Incluir tier atualizado na response do adjust
- [ ] Rodar testes adjust → GREEN
- [ ] Criar hook `useAdminRewards` (GET `/api/admin/loyalty/rewards`)
- [ ] Rodar testes hook → GREEN
- [ ] Substituir `useRewards` por `useAdminRewards` na aba Catálogo
- [ ] Rodar testes UI → GREEN
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar que recalculateTier não é chamado desnecessariamente (apenas no adjust)
- [ ] Verificar visual de rewards inativos (opacity, badge "Inativo", etc.)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
