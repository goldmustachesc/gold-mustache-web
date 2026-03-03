# 011 - Implementar job de expiração de pontos

## Fase: 7 — Refinamentos

## Prioridade: 🟠 ALTA (Integridade de dados — pontos devem expirar conforme regra de negócio)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

A `LOYALTY_CONFIG` define `POINTS_EXPIRY_MONTHS: 12` e `EXPIRY_WARNING_DAYS: 30`, e as `PointTransaction` já têm o campo `expiresAt`. Porém **não existe nenhum mecanismo** para:
1. Expirar pontos que ultrapassaram 12 meses sem atividade
2. Notificar clientes 30 dias antes da expiração

Os pontos acumulam indefinidamente, contrariando as regras de negócio do programa.

## O que implementar

### 1. Criar `src/services/loyalty/expiration.service.ts`

#### `getExpiredTransactions(date?: Date): Promise<PointTransaction[]>`
- Buscar `PointTransaction` onde `expiresAt <= date` e `type !== EXPIRED` e pontos > 0
- Filtrar apenas transações de tipo EARNED_* (não re-expirar REDEEMED ou ADJUSTED)

#### `expirePoints(date?: Date): Promise<ExpirePointsResult>`
- Para cada transação expirada:
  - Criar nova `PointTransaction` com type `EXPIRED`, pontos negativos (cancelando o original)
  - Debitar `currentPoints` do `LoyaltyAccount` (nunca abaixo de 0)
- Retornar resumo: `{ processedCount, totalPointsExpired, affectedAccounts }`
- Tudo dentro de `prisma.$transaction` por account

#### `getExpiringTransactions(warningDays?: number): Promise<PointTransaction[]>`
- Buscar transações que expiram nos próximos `warningDays` (default: 30)
- Para uso na notificação de aviso

### 2. Criar API route `POST /api/admin/loyalty/expire-points`

- Protegido com `requireAdmin`
- Chama `ExpirationService.expirePoints()`
- Retorna resultado com contagem de pontos expirados
- Opcionalmente disparar via cron job externo (Vercel Cron, etc.)

### 3. Criar API route `GET /api/admin/loyalty/expiring-points`

- Protegido com `requireAdmin`
- Retorna transações que vão expirar nos próximos 30 dias
- Para o admin ter visibilidade de pontos prestes a expirar

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/services/loyalty/__tests__/expiration.service.test.ts` | **Criar PRIMEIRO** — testes unitários |
| `src/app/api/admin/loyalty/expire-points/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do endpoint |
| `src/services/loyalty/expiration.service.ts` | **Criar** — lógica de expiração |
| `src/app/api/admin/loyalty/expire-points/route.ts` | **Criar** — endpoint admin |
| `src/app/api/admin/loyalty/expiring-points/route.ts` | **Criar** — endpoint de consulta |

## Regras de negócio

- Pontos expiram após 12 meses da data de criação (`expiresAt` da transaction)
- Apenas transações do tipo `EARNED_*` expiram (não REDEEMED, EXPIRED, ADJUSTED)
- `currentPoints` nunca pode ficar negativo após expiração
- A expiração cria uma `PointTransaction` de tipo `EXPIRED` como registro
- O `lifetimePoints` NÃO é afetado pela expiração (mantém histórico total)
- Tier NÃO é rebaixado pela expiração (tier é baseado em lifetimePoints)

## Dependências

- `LOYALTY_CONFIG.POINTS_EXPIRY_MONTHS` (já existe)
- `PointTransactionType.EXPIRED` (já existe no enum Prisma)
- Campo `expiresAt` em `PointTransaction` (já existe no schema)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/services/loyalty/__tests__/expiration.service.test.ts`

**Testes `getExpiredTransactions`:**
- [ ] Deve retornar transações onde `expiresAt <= now` e pontos > 0
- [ ] Deve ignorar transações de tipo EXPIRED (não re-expirar)
- [ ] Deve ignorar transações de tipo REDEEMED
- [ ] Deve retornar lista vazia quando nenhuma expirada

**Testes `expirePoints`:**
- [ ] Deve criar PointTransaction EXPIRED com pontos negativos para cada expirada
- [ ] Deve debitar `currentPoints` do LoyaltyAccount
- [ ] Deve NÃO deixar `currentPoints` negativo (clamp a 0)
- [ ] Deve NÃO alterar `lifetimePoints`
- [ ] Deve processar múltiplas accounts em batch
- [ ] Deve retornar resumo com `processedCount`, `totalPointsExpired`, `affectedAccounts`
- [ ] Deve não fazer nada quando nenhuma transação expirou
- [ ] Deve executar dentro de `prisma.$transaction` por account

**Testes `getExpiringTransactions`:**
- [ ] Deve retornar transações que expiram nos próximos 30 dias
- [ ] Deve não retornar transações que expiram depois de 30 dias
- [ ] Deve não retornar transações já expiradas

**Property test (fast-check):**
- [ ] Para qualquer conjunto de transações expiradas, o total de pontos expirados é igual à soma dos pontos originais (respeitando clamp a 0)

#### Arquivo: `src/app/api/admin/loyalty/expire-points/__tests__/route.test.ts`

**Testes `POST /api/admin/loyalty/expire-points`:**
- [ ] Deve retornar 401/403 quando não admin
- [ ] Deve retornar 200 com resumo de expiração
- [ ] Deve chamar `ExpirationService.expirePoints()`

- [ ] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pointTransaction: { findMany: vi.fn(), create: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar `expiration.service.ts` com esqueleto
- [ ] Implementar `getExpiredTransactions()` → rodar testes → GREEN
- [ ] Implementar `expirePoints()` → rodar testes → GREEN
- [ ] Implementar `getExpiringTransactions()` → rodar testes → GREEN
- [ ] Criar endpoint `POST /api/admin/loyalty/expire-points` → rodar testes → GREEN
- [ ] Criar endpoint `GET /api/admin/loyalty/expiring-points`
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar performance com grande volume de transações (batch processing)
- [ ] Extrair constantes para LOYALTY_CONFIG se necessário
- [ ] Verificar tipagem completa (sem `any`)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Notas de implementação

- A execução inicial pode ser via rota admin (trigger manual), evoluindo para Vercel Cron posteriormente
- Considerar processamento em batches para grandes volumes (100 transactions por batch)
- Logging detalhado para auditoria (quantos pontos expirados por execução)

## Status: 🔲 A FAZER
