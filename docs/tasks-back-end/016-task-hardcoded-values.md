# 016 - Extrair valores hardcoded para constantes/config

## Prioridade: 🟡 MÉDIA (Manutenibilidade)

## Problema

Existem "magic numbers" e valores hardcoded espalhados pelas rotas e serviços. Quando precisar alterar (ex: mudar limite de retries do Instagram), é preciso encontrar o valor no meio do código em vez de mexer num só lugar.

## Ocorrências

### 1. Cron do Instagram
**`src/app/api/cron/sync-instagram/route.ts`** (linhas 11-13)

```typescript
const MAX_RETRIES = 3;
const POSTS_LIMIT = 10;
const RETRY_BASE_DELAY_MS = 1000;
```

Deveria estar em config ou variável de ambiente.

### 2. Cron de limpeza LGPD
**`src/app/api/cron/cleanup-guests/route.ts`** (linha 76)

```typescript
const BATCH_SIZE = 50;
```

### 3. Slug generation
**`src/app/api/admin/services/[id]/route.ts`** (linha 121)

```typescript
const MAX_SLUG_ATTEMPTS = 100;
```

### 4. Range padrão de appointments
**`src/app/api/appointments/route.ts`** (linha 53)

```typescript
7 * 24 * 60 * 60 * 1000  // 7 dias em ms — sem nome
```

### 5. User ID sintético para barbeiros
**`src/app/api/admin/barbers/route.ts`** (linha 99)

```typescript
userId: `pending_${Date.now()}_${Math.random()...}`
```

Barbeiros são criados com IDs falsos em vez de serem vinculados a users reais do Supabase.

## O que corrigir

### Opção A: Constantes nomeadas no arquivo

```typescript
const DEFAULT_APPOINTMENT_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
```

### Opção B: Centralizar em config (para valores que podem mudar por ambiente)

```typescript
// src/config/api.ts
export const API_CONFIG = {
  instagram: {
    maxRetries: Number(process.env.INSTAGRAM_MAX_RETRIES) || 3,
    postsLimit: Number(process.env.INSTAGRAM_POSTS_LIMIT) || 10,
    retryBaseDelayMs: 1000,
  },
  cron: {
    guestCleanupBatchSize: 50,
  },
  appointments: {
    defaultRangeMs: 7 * 24 * 60 * 60 * 1000,
  },
  slugGeneration: {
    maxAttempts: 100,
  },
};
```

## Checklist

- [ ] Criar `src/config/api.ts` com constantes centralizadas
- [ ] Substituir magic numbers no cron do Instagram
- [ ] Substituir magic numbers no cron de limpeza
- [ ] Nomear constante de range padrão em appointments
- [ ] Nomear constante de max slug attempts
- [ ] Documentar o problema do `pending_` userId (task separada se necessário)
- [ ] Revisar se há mais magic numbers não listados
