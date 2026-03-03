# 008 - Implementar página de relatórios de fidelidade (admin)

## Fase: 6 — Admin UI (Feature nova)

## Prioridade: 🟡 MÉDIA (Analytics e visibilidade operacional)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O plano original define `GET /api/admin/loyalty/reports` com métricas de engajamento, mas **nada disso existe**. O admin não tem visibilidade sobre a saúde do programa de fidelidade — taxa de adesão, resgates, distribuição de tiers, etc.

## O que implementar

### 1. Endpoint `GET /api/admin/loyalty/reports`

Retornar métricas agregadas:

```json
{
  "success": true,
  "data": {
    "totalAccounts": 142,
    "tierDistribution": {
      "BRONZE": 98,
      "SILVER": 30,
      "GOLD": 11,
      "DIAMOND": 3
    },
    "totalPointsInCirculation": 45200,
    "totalPointsRedeemed": 12800,
    "totalRedemptions": 67,
    "redemptionsByStatus": {
      "PENDING": 12,
      "USED": 48,
      "EXPIRED": 7
    },
    "topRewards": [
      { "name": "Barba grátis", "count": 23 },
      { "name": "Desconto R$10", "count": 19 }
    ],
    "recentActivity": {
      "pointsEarnedLast30Days": 8500,
      "redemptionsLast30Days": 15,
      "newAccountsLast30Days": 8
    }
  }
}
```

### 2. Página admin reports

Nova página ou aba com cards de métricas:

**KPIs (cards no topo):**
- Total de contas ativas
- Pontos em circulação
- Resgates este mês
- Taxa de resgate (resgates / contas)

**Gráficos/Distribuições:**
- Distribuição por tier (bar chart ou donut) — pode usar elementos visuais simples com Tailwind, sem lib de gráfico
- Top recompensas mais resgatadas (lista ordenada)
- Atividade dos últimos 30 dias

### 3. Hook admin

- `useAdminLoyaltyReports` — GET `/api/admin/loyalty/reports`

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/admin/loyalty/reports/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do endpoint |
| `src/app/[locale]/(protected)/admin/loyalty/__tests__/reports-tab.test.tsx` | **Criar PRIMEIRO** — testes da UI |
| `src/hooks/__tests__/useAdminLoyalty.reports.test.tsx` | **Criar PRIMEIRO** — teste do hook |
| `src/app/api/admin/loyalty/reports/route.ts` | **Criar** — endpoint |
| `src/app/[locale]/(protected)/admin/loyalty/page.tsx` | **Modificar** — adicionar aba "Relatórios" |
| `src/hooks/useAdminLoyalty.ts` | **Modificar** — adicionar hook de reports |

## Padrão de referência

Seguir o padrão da página de faturamento (`admin/faturamento/page.tsx`) para cards de KPIs e layout de métricas.

## Dependências

- Nenhuma dependência técnica forte — pode ser implementada a qualquer momento
- Mais útil após tasks 001-003 (dados reais de resgates e referrals)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Testes do endpoint — `reports/__tests__/route.test.ts`

**Testes `GET /api/admin/loyalty/reports`:**
- [ ] Deve retornar 401/403 quando não admin
- [ ] Deve retornar 200 com objeto de métricas completo
- [ ] Deve retornar `totalAccounts` como count de LoyaltyAccount
- [ ] Deve retornar `tierDistribution` com contagem por tier
- [ ] Deve retornar `totalPointsInCirculation` como soma de `currentPoints`
- [ ] Deve retornar `totalPointsRedeemed` como soma absoluta de transactions REDEEMED
- [ ] Deve retornar `redemptionsByStatus` com contagem por status derivado
- [ ] Deve retornar `topRewards` ordenado por count decrescente
- [ ] Deve retornar `recentActivity` com dados dos últimos 30 dias
- [ ] Deve funcionar com banco vazio (sem crash, valores zerados)

#### Testes do hook — `useAdminLoyalty.reports.test.tsx`

- [ ] `useAdminLoyaltyReports` deve chamar `GET /api/admin/loyalty/reports`
- [ ] Deve retornar dados tipados como `LoyaltyReportsResponse`

#### Testes da UI — `reports-tab.test.tsx`

- [ ] Deve renderizar aba "Relatórios" no TabsList
- [ ] Deve renderizar 4 KPI cards (contas, pontos, resgates, taxa)
- [ ] Deve renderizar distribuição de tiers com barras visuais
- [ ] Deve renderizar lista de top rewards
- [ ] Deve exibir loading state enquanto carrega
- [ ] Deve exibir estado vazio quando sem dados

- [ ] Rodar `pnpm test` → confirmar que testes relevantes falham (RED)

### Mocks necessários

```typescript
// Endpoint test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    pointTransaction: { aggregate: vi.fn(), groupBy: vi.fn() },
    redemption: { count: vi.fn(), groupBy: vi.fn() },
  },
}));

// UI test
vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminLoyaltyReports: () => ({
    data: mockReportsData,
    isLoading: false,
  }),
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar endpoint com queries agregadas → rodar testes → GREEN
- [ ] Criar hook → rodar testes → GREEN
- [ ] Implementar UI com KPI cards + distribuição + top rewards → rodar testes → GREEN
- [ ] Adicionar i18n keys
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Otimizar queries (evitar N+1, usar groupBy quando possível)
- [ ] Extrair cálculo de "status derivado" de redemption em shared utility
- [ ] Verificar performance com banco grande (índices existentes cobrem?)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
