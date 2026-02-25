# 005 - Adicionar rate limiting em rotas públicas

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

As rotas públicas não possuem rate limiting. Um atacante pode fazer milhares de requisições por segundo para:
- Fazer scraping de dados (serviços, barbeiros, slots)
- Sobrecarregar o banco de dados (DDoS)
- Descobrir padrões de agenda dos barbeiros

### Rotas com rate limit hoje ✅
- `src/app/api/appointments/route.ts` — POST (appointments, 10/min)
- `src/app/api/appointments/guest/route.ts` — POST (guestAppointments, 5/min)
- `src/app/api/profile/export/route.ts` — GET (sensitive, 3/min)
- `src/app/api/profile/delete/route.ts` — DELETE (sensitive, 3/min)
- `src/app/api/guest/delete-request/route.ts` — POST (sensitive, 3/min)

### Rotas SEM rate limit ❌
- `src/app/api/slots/route.ts` — GET (público)
- `src/app/api/services/route.ts` — GET (público)
- `src/app/api/barbers/route.ts` — GET (público)
- `src/app/api/instagram/posts/route.ts` — GET (público)
- `src/app/api/consent/route.ts` — POST
- `src/app/api/appointments/guest/lookup/route.ts` — GET
- `src/app/api/appointments/guest/[id]/cancel/route.ts` — POST
- `src/app/api/appointments/guest/[id]/feedback/route.ts` — POST

## O que corrigir

Usar o limiter `api` (100/min) já existente nas rotas públicas de leitura, e `guestAppointments` (5/min) nas ações de guest:

```typescript
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// No início do handler:
const rateLimit = await checkRateLimit("api", getClientIdentifier(request));
if (!rateLimit.success) {
  return NextResponse.json(
    { error: "RATE_LIMITED", message: "Muitas requisições. Tente novamente." },
    { status: 429 }
  );
}
```

## Checklist

- [ ] Adicionar rate limit `api` em `/api/slots`
- [ ] Adicionar rate limit `api` em `/api/services`
- [ ] Adicionar rate limit `api` em `/api/barbers`
- [ ] Adicionar rate limit `api` em `/api/instagram/posts`
- [ ] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/lookup`
- [ ] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/[id]/cancel`
- [ ] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/[id]/feedback`
- [ ] Adicionar rate limit `api` em `/api/consent` POST
- [ ] Testar que requests dentro do limite passam normalmente
- [ ] Testar que requests acima do limite recebem 429
