# 005 - Adicionar rate limiting em rotas públicas

## Status: ✅ Concluído

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

As rotas públicas não possuíam rate limiting. Um atacante poderia fazer milhares de requisições por segundo para:
- Fazer scraping de dados (serviços, barbeiros, slots)
- Sobrecarregar o banco de dados (DDoS)
- Descobrir padrões de agenda dos barbeiros

### Rotas com rate limit ✅
- `src/app/api/appointments/route.ts` — POST (appointments, 10/min)
- `src/app/api/appointments/guest/route.ts` — POST (guestAppointments, 5/min)
- `src/app/api/profile/export/route.ts` — GET (sensitive, 3/min)
- `src/app/api/profile/delete/route.ts` — DELETE (sensitive, 3/min)
- `src/app/api/guest/delete-request/route.ts` — POST (sensitive, 3/min)
- `src/app/api/slots/route.ts` — GET (api, 100/min)
- `src/app/api/services/route.ts` — GET (api, 100/min)
- `src/app/api/barbers/route.ts` — GET (api, 100/min)
- `src/app/api/instagram/posts/route.ts` — GET (api, 100/min)
- `src/app/api/consent/route.ts` — POST/GET (api, 100/min)
- `src/app/api/appointments/guest/lookup/route.ts` — GET (guestAppointments, 5/min)
- `src/app/api/appointments/guest/[id]/cancel/route.ts` — POST (guestAppointments, 5/min)
- `src/app/api/appointments/guest/[id]/feedback/route.ts` — POST (guestAppointments, 5/min)

## Implementação

O limiter `api` (100/min) é usado nas rotas públicas de leitura; `guestAppointments` (5/min) nas ações de guest:

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

- [x] Adicionar rate limit `api` em `/api/slots`
- [x] Adicionar rate limit `api` em `/api/services`
- [x] Adicionar rate limit `api` em `/api/barbers`
- [x] Adicionar rate limit `api` em `/api/instagram/posts`
- [x] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/lookup`
- [x] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/[id]/cancel`
- [x] Adicionar rate limit `guestAppointments` em `/api/appointments/guest/[id]/feedback`
- [x] Adicionar rate limit `api` em `/api/consent` POST
- [x] Testar que requests dentro do limite passam normalmente
- [x] Testar que requests acima do limite recebem 429
