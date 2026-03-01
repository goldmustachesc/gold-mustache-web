# 020 - Remover dead code e usar schemas existentes

## Prioridade: 🟢 BAIXA (Limpeza)

## Problema

Existem schemas de validação e código criados mas nunca utilizados, e schemas que são usados parcialmente ou de forma redundante.

## Casos identificados

### 1. Schema existente não usado
**`src/lib/validations/booking.ts`** — `getAppointmentsQuerySchema`

Este schema valida `startDate`, `endDate` e `barberId` corretamente, mas o endpoint `GET /api/appointments` não o utiliza. Faz validação manual parcial em vez de usar o schema pronto.

Será resolvido junto com a task 006.

### 2. Campo `email` validado mas não usado
**`src/app/api/admin/barbers/route.ts`** — `createBarberSchema`

O schema inclui campo `email`, mas ao criar o barbeiro, apenas `name` e `avatarUrl` são usados. O `email` é validado e descartado.

```typescript
const createBarberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(), // Validado mas nunca usado
  avatarUrl: z.string().url().optional(),
});
```

Barbeiros são criados com `userId: pending_${Date.now()}_...` — sem vínculo real com um user do Supabase. O `email` deveria ser usado para vincular ao Supabase ou removido do schema.

### 3. Mock data em endpoints admin de loyalty
**`src/app/api/admin/loyalty/accounts/route.ts`** — retorna dados mockados
**`src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts`** — simula sucesso sem persistir

Esses endpoints retornam dados fictícios. Devem ser implementados de verdade ou marcados claramente como WIP/TODO.

## Checklist

- [x] Usar `getAppointmentsQuerySchema` no GET de appointments (task 006) — já estava implementado
- [x] Decidir: usar `email` para vincular ao Supabase (lookup via admin API, fallback para pending userId)
- [x] Implementar endpoint real de loyalty accounts (usando Prisma + Supabase admin API para emails)
- [x] Implementar endpoint real de loyalty adjust (usando Prisma $transaction com PointTransaction)
- [x] Remover mock data dos endpoints de loyalty
- [x] Rodar busca por exports não utilizados em `src/lib/validations/`
  - Removidos de `booking.ts`: `cancelAppointmentSchema`, `guestLookupSchema`, `cancelGuestAppointmentSchema`, `createServiceSchema` e seus tipos
  - Removido de `service.ts`: `toggleServiceStatusSchema` e seu tipo
