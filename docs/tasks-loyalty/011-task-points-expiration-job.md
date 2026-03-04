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
| `src/services/loyalty/__tests__/expiration.service.test.ts` | ✅ **Criado** — testes unitários |
| `src/app/api/admin/loyalty/expire-points/__tests__/route.test.ts` | ✅ **Criado** — testes do endpoint |
| `src/app/api/admin/loyalty/expiring-points/__tests__/route.test.ts` | ✅ **Criado** — testes do endpoint de consulta |
| `src/services/loyalty/expiration.service.ts` | ✅ **Criado** — lógica de expiração |
| `src/app/api/admin/loyalty/expire-points/route.ts` | ✅ **Criado** — endpoint admin |
| `src/app/api/admin/loyalty/expiring-points/route.ts` | ✅ **Criado** — endpoint de consulta |

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
- [x] Deve retornar transações onde `expiresAt <= now` e pontos > 0
- [x] Deve ignorar transações de tipo EXPIRED (não re-expirar)
- [x] Deve ignorar transações de tipo REDEEMED
- [x] Deve retornar lista vazia quando nenhuma expirada
- [x] Deve excluir transações que já possuem counterpart EXPIRED (idempotência)
- [x] Deve retornar todos os candidatos quando nenhum foi processado

**Testes `expirePoints`:**
- [x] Deve criar PointTransaction EXPIRED com pontos negativos para cada expirada
- [x] Deve debitar `currentPoints` do LoyaltyAccount
- [x] Deve NÃO deixar `currentPoints` negativo (clamp a 0)
- [x] Deve NÃO alterar `lifetimePoints`
- [x] Deve processar múltiplas accounts em batch
- [x] Deve retornar resumo com `processedCount`, `totalPointsExpired`, `affectedAccounts`
- [x] Deve não fazer nada quando nenhuma transação expirou
- [x] Deve executar dentro de `prisma.$transaction` por account
- [x] Deve não re-expirar transações que já possuem counterpart EXPIRED (idempotência)
- [x] Deve pular accounts que não existem mais e não contá-las no resultado
- [x] Deve reportar `totalPointsExpired` como valor clamped (não soma total)

**Testes `getExpiringTransactions`:**
- [x] Deve retornar transações que expiram nos próximos 30 dias
- [x] Deve não retornar transações que expiram depois de 30 dias
- [x] Deve não retornar transações já expiradas

**Property test (fast-check):**
- [x] Para qualquer conjunto de transações expiradas, o total de pontos expirados é igual à soma dos pontos originais (respeitando clamp a 0)

#### Arquivo: `src/app/api/admin/loyalty/expire-points/__tests__/route.test.ts`

**Testes `POST /api/admin/loyalty/expire-points`:**
- [x] Deve retornar 401/403 quando não admin
- [x] Deve retornar 200 com resumo de expiração
- [x] Deve chamar `ExpirationService.expirePoints()`

#### Arquivo: `src/app/api/admin/loyalty/expiring-points/__tests__/route.test.ts`

**Testes `GET /api/admin/loyalty/expiring-points`:**
- [x] Deve retornar 401/403 quando não admin
- [x] Deve retornar 200 com lista de transações prestes a expirar
- [x] Deve chamar `ExpirationService.getExpiringTransactions()`

- [x] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

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

- [x] Criar `expiration.service.ts` com esqueleto
- [x] Implementar `getExpiredTransactions()` → rodar testes → GREEN
- [x] Implementar `expirePoints()` → rodar testes → GREEN
- [x] Implementar `getExpiringTransactions()` → rodar testes → GREEN
- [x] Criar endpoint `POST /api/admin/loyalty/expire-points` → rodar testes → GREEN
- [x] Criar endpoint `GET /api/admin/loyalty/expiring-points` → rodar testes → GREEN
- [x] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [x] Verificar performance com grande volume de transações (batch processing)
- [x] Extrair constantes para LOYALTY_CONFIG se necessário
- [x] Verificar tipagem completa (sem `any`)
- [x] Rodar `pnpm test` → continua GREEN
- [x] `pnpm lint` ✅ e `pnpm build` ✅

## Notas de implementação

- A execução inicial pode ser via rota admin (trigger manual), evoluindo para Vercel Cron posteriormente
- Considerar processamento em batches para grandes volumes (100 transactions por batch)
- Logging detalhado para auditoria (quantos pontos expirados por execução)

## Status: ✅ CONCLUÍDO
