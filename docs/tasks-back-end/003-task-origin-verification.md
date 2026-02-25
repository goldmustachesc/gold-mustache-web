# 003 - Expandir verificação de origem (CSRF) para rotas sensíveis

## Status: ✅ CONCLUÍDA

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

O helper `requireValidOrigin()` existe e funciona corretamente em `src/lib/api/verify-origin.ts`, mas é usado em **apenas 3 arquivos**:

- `src/app/api/profile/delete/route.ts` ✅
- `src/app/api/admin/services/route.ts` ✅
- `src/app/api/admin/services/[id]/route.ts` ✅

Todas as outras rotas de escrita (POST, PUT, DELETE, PATCH) estão desprotegidas contra CSRF.

## Rotas que precisam de origin verification

### Admin (alta prioridade)
- `src/app/api/admin/settings/route.ts` — PUT
- `src/app/api/admin/shop-hours/route.ts` — PUT
- `src/app/api/admin/shop-closures/route.ts` — POST
- `src/app/api/admin/shop-closures/[id]/route.ts` — PUT, DELETE
- `src/app/api/admin/barbers/route.ts` — POST
- `src/app/api/admin/barbers/[id]/route.ts` — PUT, PATCH
- `src/app/api/admin/barbers/[id]/working-hours/route.ts` — PUT
- `src/app/api/admin/loyalty/rewards/route.ts` — POST
- `src/app/api/admin/loyalty/rewards/[id]/route.ts` — PUT, DELETE
- `src/app/api/admin/loyalty/rewards/[id]/toggle/route.ts` — POST
- `src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts` — POST

### Perfil e agendamentos
- `src/app/api/profile/me/route.ts` — PUT
- `src/app/api/appointments/route.ts` — POST
- `src/app/api/appointments/[id]/cancel/route.ts` — POST
- `src/app/api/appointments/[id]/feedback/route.ts` — POST
- `src/app/api/appointments/[id]/no-show/route.ts` — POST
- `src/app/api/appointments/[id]/reminder/route.ts` — POST

### Barbeiro
- `src/app/api/barbers/me/working-hours/route.ts` — PUT
- `src/app/api/barbers/me/appointments/route.ts` — POST
- `src/app/api/barbers/me/absences/route.ts` — POST
- `src/app/api/barbers/me/absences/[id]/route.ts` — PUT, DELETE
- `src/app/api/barbers/me/clients/route.ts` — POST
- `src/app/api/barbers/me/clients/[id]/route.ts` — PATCH

### Notificações
- `src/app/api/notifications/mark-all-read/route.ts` — POST
- `src/app/api/notifications/[id]/read/route.ts` — POST

## O que corrigir

Adicionar no início de cada método de escrita:

```typescript
const originError = requireValidOrigin(request);
if (originError) return originError;
```

## Dica de implementação

Considerar criar um wrapper ou middleware que aplique automaticamente em todos os métodos POST/PUT/PATCH/DELETE, para evitar esquecimentos futuros.

## Checklist

- [x] Adicionar `requireValidOrigin` em todas as rotas admin de escrita
- [x] Adicionar em rotas de perfil e agendamentos
- [x] Adicionar em rotas de barbeiro
- [x] Adicionar em rotas de notificações
- [x] Testar com Origin válida (deve passar)
- [x] Testar com Origin inválida (deve retornar 403)
- [x] Testar sem Origin (deve passar — same-origin)
