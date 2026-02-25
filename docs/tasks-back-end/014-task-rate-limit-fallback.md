# 014 - Implementar fallback de rate limiting sem Redis

## Prioridade: 🟡 MÉDIA (Segurança / DevEx)

## Problema

Quando as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` não estão configuradas, o rate limiting inteiro vira **no-op** — todas as requisições passam sem limite.

```typescript
// Se rate limiting is not configured, allow all requests
if (!rateLimiters) {
  return { success: true, remaining: 999, reset: 0 };
}
```

Isso significa:
- **Desenvolvimento local:** sem proteção (aceitável, mas devs não testam rate limiting)
- **Se alguém esquecer de configurar em produção:** zero proteção contra abuso

## Arquivo afetado

- `src/lib/rate-limit.ts`

## O que corrigir

### Opção A: Rate limiting in-memory para dev (recomendada)

Usar um Map simples como fallback quando Redis não está disponível:

```typescript
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, reset: entry.resetAt };
}
```

### Opção B: Warning em produção

Se Redis não estiver configurado em produção, logar warning na inicialização:

```typescript
if (!isConfigured && process.env.NODE_ENV === "production") {
  console.warn("⚠️ RATE LIMITING DISABLED: Upstash Redis not configured");
}
```

## Checklist

- [ ] Implementar fallback in-memory para rate limiting
- [ ] Adicionar warning em produção quando Redis não está configurado
- [ ] Limpar entries expiradas do Map periodicamente (evitar memory leak)
- [ ] Testar rate limiting funciona em dev sem Redis
- [ ] Documentar no `.env.example` que Upstash é recomendado para produção
