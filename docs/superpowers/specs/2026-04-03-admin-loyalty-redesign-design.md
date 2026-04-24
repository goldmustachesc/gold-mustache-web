# Admin Loyalty Redesign - Design Spec

## Contexto

A página `admin/loyalty` é monolítica (396 linhas no `page.tsx`) com todo estado, lógica e UI das 4 abas num único arquivo. O redesign decompõe em componentes dedicados e adiciona funcionalidades pedidas pelo negócio.

## Objetivo

Redesign completo da página de Gestão de Fidelidade (admin), incluindo:
- Decomposição arquitetural do `page.tsx` monolítico
- Dashboard de KPIs no topo
- Busca, filtros e ordenação na aba Contas
- Histórico de transações inline por cliente
- CRUD completo de rewards no Catálogo
- Gestão de pontos expirando
- Melhoria de responsividade mobile

## Escopo explícito

**Incluso:**
- Frontend: novos componentes + refatoração da página
- API: extensão do endpoint de accounts (search, tier filter, sort)
- Hook novo para transações de um cliente específico
- Testes para componentes novos e APIs alteradas

**Fora de escopo:**
- Mudanças no modelo Prisma (dados já existem)
- Novas notificações push/email
- Alterações nas páginas do cliente (loyalty dashboard do usuário)

---

## Arquitetura

### Estrutura Atual

```
src/app/[locale]/(protected)/admin/loyalty/
└── page.tsx (396 linhas — 4 abas, diálogos, estado, tudo junto)

src/components/admin/
├── RedemptionsTab.tsx (existente, bem estruturado)
├── ReportsTab.tsx (existente, bem estruturado)
└── KpiCard.tsx (existente, reutilizável)
```

### Nova Estrutura

```
src/app/[locale]/(protected)/admin/loyalty/
└── page.tsx (~40 linhas — orquestrador fino)

src/components/admin/loyalty/
├── AdminLoyaltyPage.tsx      # Client component principal, gerencia tabs
├── QuickStats.tsx            # Strip de KPIs no topo
├── AccountsTab.tsx           # Aba Contas com busca/filtros/paginação
├── AccountCard.tsx           # Card mobile de conta individual
├── AccountFilters.tsx        # Barra de busca + filtros tier + sort
├── AccountTransactions.tsx   # Histórico expandível inline
├── AdjustPointsDialog.tsx    # Dialog de ajuste de pontos (extraído)
├── CatalogTab.tsx            # Aba Catálogo com CRUD completo
├── RewardAdminCard.tsx       # Card de reward com edit/delete/toggle
├── DeleteRewardDialog.tsx    # Confirmação de exclusão
├── ExpirationAlert.tsx       # Banner de pontos expirando
└── index.ts

src/components/admin/
├── RedemptionsTab.tsx        # Manter (apenas melhorar mobile)
├── ReportsTab.tsx            # Manter como está
└── KpiCard.tsx               # Reutilizar
```

### Princípio de decomposição

Cada componente de aba é independente: gerencia seu próprio estado local, usa seus próprios hooks, e se comunica com o pai apenas via props de callback quando necessário. O `AdminLoyaltyPage` é um orquestrador de tabs sem lógica de negócio.

---

## Componentes — Detalhamento

### 1. AdminLoyaltyPage

Orquestrador fino. Responsabilidades:
- Configurar `usePrivateHeader`
- Renderizar `QuickStats`
- Renderizar `Tabs` com 4 abas
- Sem estado de negócio próprio

```
┌────────────────────────────────────────────┐
│  ← Gestão de Fidelidade           🔔  ≡  │
├────────────────────────────────────────────┤
│  QuickStats                                │
├────────────────────────────────────────────┤
│  [Contas] [Catálogo] [Resgates] [Relatórios]│
├────────────────────────────────────────────┤
│  {tab content}                             │
└────────────────────────────────────────────┘
```

### 2. QuickStats

Strip de 4 KPIs usando o `KpiCard` existente. Visível em todas as abas.

| KPI | Fonte de dados | Ícone |
|-----|---------------|-------|
| Total de Contas | `useAdminLoyaltyReports` → `totalAccounts` | Users |
| Pontos em Circulação | `useAdminLoyaltyReports` → `totalPointsInCirculation` | Coins |
| Resgates Pendentes | `useAdminLoyaltyReports` → `redemptionsByStatus.PENDING` | TicketCheck |
| Pontos Expirando | Novo: `useAdminExpiringPoints` → count | AlertTriangle |

O KPI "Pontos Expirando" fica com estilo `warning` (âmbar) quando > 0.

Dados do `useAdminLoyaltyReports` já retornam quase tudo. Para "expirando", usamos o endpoint existente `GET /api/admin/loyalty/expiring-points`.

### 3. AccountsTab

A maior mudança. Layout:

```
┌────────────────────────────────────────────┐
│  AccountFilters                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Buscar por nome ou email...      │  │
│  │                                      │  │
│  │ [Todos] [Bronze] [Silver] [Gold] [Diamond] │
│  │                    Ordenar: Pontos ▼ │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ExpirationAlert (condicional)             │
│                                            │
│  Desktop: Tabela com sort nos headers      │
│  Mobile: AccountCard list                  │
│                                            │
│  Paginação                                 │
└────────────────────────────────────────────┘
```

**Estado local:**
- `search: string` — debounced (300ms) para a API
- `tierFilter: LoyaltyTier | 'ALL'`
- `sortBy: 'points' | 'name' | 'tier' | 'createdAt'`
- `sortOrder: 'asc' | 'desc'`
- `page: number`

**Dados:** `useAdminLoyaltyAccounts(page, limit, { search, tier, sortBy, sortOrder })`

### 4. AccountCard (mobile)

Card expandível com mais contexto que o atual.

```
┌──────────────────────────────────────┐
│  Ygor Oliveira                 60 pts│
│  ygor@email.com               Bronze │
│  Membro desde Jan/25 • 0 resgates   │
│                                      │
│  [▼ Extrato]          [⇄ Ajustar]   │
├──────────────────────────────────────┤ (expandido)
│  AccountTransactions inline          │
│  +50  Bônus primeiro agend.  01/Jan  │
│  +10  Agendamento #GM-0123  15/Jan  │
│  -30  Resgate: Desconto 10% 20/Fev  │
│                    [Ver mais →]      │
└──────────────────────────────────────┘
```

**Props:**
```typescript
interface AccountCardProps {
  account: AdminLoyaltyAccountExtended;
  onAdjust: (account: AdminLoyaltyAccountExtended) => void;
}
```

**AccountTransactions** carrega sob demanda (lazy) ao expandir, usando um novo hook `useAdminAccountTransactions(accountId)`.

### 5. AccountFilters

Barra de filtros responsiva.

**Desktop:** input de busca + botões de tier inline + select de sort
**Mobile:** input de busca + tier como chips scrolláveis + sort como select

Tier filter usa botões toggle (não radio). "Todos" é o default.

### 6. AdjustPointsDialog

Extraído do `page.tsx` atual sem alterações de comportamento. Mesma UI, apenas em componente próprio.

**Props:**
```typescript
interface AdjustPointsDialogProps {
  account: AdminLoyaltyAccountExtended | null;
  onClose: () => void;
}
```

Usa `useAdminAdjustPoints` internamente.

### 7. CatalogTab

Redesign com CRUD completo. Os hooks `useAdminUpdateReward` e `useAdminDeleteReward` já existem mas não são usados na UI atual.

```
┌────────────────────────────────────────────┐
│  Itens do Catálogo            [+ Novo Item]│
├────────────────────────────────────────────┤
│  RewardAdminCard                           │
│  ┌──────────────────────────────────────┐  │
│  │ Corte Grátis        500 pts  Ativo  │  │
│  │ Ganhe um corte...                   │  │
│  │ Estoque: ∞ • 12 resgates           │  │
│  │              [✏️ Editar] [🗑️ Excluir]│  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**RewardAdminCard** mostra:
- Nome + custo em pontos + badge ativo/inativo
- Descrição
- Estoque (∞ se null) + total de resgates (`totalRedemptions` já vem no `AdminReward`)
- Ações: Switch ativo, botão Editar, botão Excluir

**Editar:** reutiliza `RewardModal` existente, passando `initialData` e `rewardId` para modo edição. O `RewardModal` precisa de ajuste menor para aceitar `mode: 'create' | 'edit'` e usar `useAdminUpdateReward` no modo edit.

**Excluir:** `DeleteRewardDialog` com confirmação. Usa `useAdminDeleteReward`.

### 8. ExpirationAlert

Banner condicional que aparece na aba Contas quando há pontos expirando nos próximos 30 dias.

```
┌──────────────────────────────────────────────┐
│ ⚠️ 120 pontos de 3 clientes expiram nos     │
│    próximos 30 dias.            [Ver contas] │
└──────────────────────────────────────────────┘
```

"Ver contas" filtra a aba Contas para mostrar apenas contas com pontos expirando (filtro local ou query param).

Dados do endpoint existente: `GET /api/admin/loyalty/expiring-points`.

### 9. RedemptionsTab

Mudanças mínimas na `RedemptionsTab` existente:
- Melhorar layout mobile da tabela (usar cards como padrão do projeto)
- Manter toda a lógica e API atual

### 10. ReportsTab

Sem mudanças. Já está bem estruturado com KPIs, distribuição por tier e atividade recente.

---

## Mudanças de API

### Extensão: GET /api/admin/loyalty/accounts

**Parâmetros novos:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `search` | string | — | Busca case-insensitive em `fullName` |
| `tier` | LoyaltyTier | — | Filtro por tier |
| `sortBy` | `'points' \| 'name' \| 'tier' \| 'createdAt'` | `'points'` | Campo de ordenação |
| `sortOrder` | `'asc' \| 'desc'` | `'desc'` | Direção |
| `page` | number | 1 | Já existe |
| `limit` | number | 20 | Já existe (reduzir default de 50 para 20) |

**Resposta estendida** — adicionar campos ao DTO:

```typescript
interface AdminLoyaltyAccountExtended {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  points: number;
  lifetimePoints: number;     // novo
  tier: LoyaltyTier;
  memberSince: string;        // novo: createdAt da LoyaltyAccount
  redemptionCount: number;    // novo: count de Redemption
}
```

Os dados de `lifetimePoints`, `createdAt` e count de redemptions vêm de joins simples no Prisma — sem novas tabelas.

### Novo: GET /api/admin/loyalty/accounts/[accountId]/transactions

Retorna transações paginadas de uma conta específica. Para o histórico inline expandível.

```typescript
// Request
GET /api/admin/loyalty/accounts/{accountId}/transactions?page=1&limit=10

// Response
{
  data: Array<{
    id: string;
    type: PointTransactionType;
    points: number;
    description: string | null;
    createdAt: string;
    expiresAt: string | null;
  }>;
  meta: { page, limit, total, totalPages };
}
```

---

## Hooks Novos/Alterados

### Alterado: useAdminLoyaltyAccounts

```typescript
interface AccountsParams {
  search?: string;
  tier?: LoyaltyTier;
  sortBy?: 'points' | 'name' | 'tier' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

function useAdminLoyaltyAccounts(
  page?: number,
  limit?: number,
  params?: AccountsParams
): UseQueryResult<AdminLoyaltyAccountExtended[]>
```

### Novo: useAdminAccountTransactions

```typescript
function useAdminAccountTransactions(
  accountId: string,
  page?: number,
  limit?: number,
  enabled?: boolean  // false por default, true ao expandir o card
): UseQueryResult<PaginatedResponse<AccountTransaction>>
```

### Novo: useAdminExpiringPoints

```typescript
function useAdminExpiringPoints(): UseQueryResult<{
  totalPoints: number;
  accountCount: number;
  transactions: ExpiringTransaction[];
}>
```

---

## Alteração no RewardModal

O `RewardModal` atual só suporta criação. Precisa suportar edição:

```typescript
interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardId?: string;  // se presente, modo edição
}
```

- Sem `rewardId`: comportamento atual (criar)
- Com `rewardId`: carrega dados via `useAdminReward(rewardId)`, usa `useAdminUpdateReward` no submit, botão muda para "Salvar Alterações"

O `RewardForm` já aceita `initialData` — só precisa passar os dados carregados.

---

## Decisões de design

1. **Filtros client-side vs server-side:** Server-side (API). O volume de contas pode crescer e paginação server-side já existe.

2. **Histórico inline vs modal:** Inline expandível. Evita navegação e mantém contexto visual. Carregamento lazy ao expandir.

3. **Expiração como aba vs alerta:** Alerta contextual. Não merece uma aba própria; é informação que o admin precisa ver proativamente.

4. **Sort no header da tabela desktop:** Sim. Headers clicáveis com ícone de direção. Padrão UX consolidado.

5. **Debounce na busca:** 300ms. Evita requisições a cada keystroke sem parecer lento.

---

## Testes

Cada componente novo recebe teste unitário seguindo padrão TDD do projeto:

| Componente | Testes essenciais |
|------------|-------------------|
| AccountsTab | Renderiza contas, busca funciona, filtro de tier funciona, sort funciona, paginação |
| AccountCard | Renderiza dados, expande/colapsa, mostra transações |
| AccountFilters | Emite eventos de busca/filtro/sort |
| AdjustPointsDialog | Abre com dados, salva, cancela |
| CatalogTab | Lista rewards, toggle, edit abre modal, delete com confirmação |
| QuickStats | Renderiza KPIs, destaca expiração |
| API accounts | search, tier filter, sort, pagination, auth |
| API transactions | Lista por conta, paginação, auth |

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| PR muito grande | Implementar em steps: API primeiro, depois componentes por aba |
| Regressão nas abas existentes | Manter `RedemptionsTab` e `ReportsTab` intocados inicialmente |
| Performance com muitas contas | Paginação server-side + debounce na busca |
| Breaking change na interface AdminLoyaltyAccount | Extensão aditiva (novos campos), não remove os existentes |
