# 019 - Melhorar type safety em pontos frágeis

## Prioridade: 🟢 BAIXA (Qualidade de código)

## Problema

Existem pontos no código onde castings (`as`) e tipagem frouxa podem esconder bugs em runtime. TypeScript não consegue proteger nesses casos.

## Ocorrências

### 1. Body sem tipo no adjust de pontos
**`src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts`** (linha 10)

```typescript
const body = await req.json(); // tipo: any
const { points, reason } = body; // sem tipagem
```

`body` é `any` — qualquer propriedade pode ser acessada sem erro de compilação. Será resolvido junto com a task 006 (validação Zod), que tiparia automaticamente.

### 2. Cast de `where.date` como object
**`src/app/api/barbers/me/absences/route.ts`** (linhas 56, 64)

```typescript
where.date as object
```

Casting frágil para construção dinâmica de filtro de data. Melhor usar tipo explícito do Prisma.

### 3. Cast de JSON fields no notification service
**`src/services/notification.ts`** (linhas 30, 41)

```typescript
input.data as object
notification.data as Record<string, unknown>
```

Campos JSON do Prisma são `JsonValue` por padrão. Os casts escondem possíveis incompatibilidades de formato.

### 4. Prisma error check manual
**`src/app/api/admin/loyalty/rewards/route.ts`** (linha 161-166)
**`src/app/api/admin/loyalty/rewards/[id]/toggle/route.ts`** (linha 97-101)

```typescript
if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
```

Essa verificação manual seria desnecessária se usasse `handlePrismaError` (task 008). Também é frágil pois `error` está tipado como `unknown`.

## O que corrigir

### Para JSON fields, criar tipos explícitos:

```typescript
// src/types/notification.ts
export interface NotificationData {
  appointmentId?: string;
  barberId?: string;
  serviceName?: string;
  date?: string;
  time?: string;
}
```

### Para where dinâmico, usar tipo Prisma:

```typescript
import { Prisma } from "@prisma/client";

const where: Prisma.BarberAbsenceWhereInput = {};
if (startDate) {
  where.date = { gte: new Date(startDate) };
}
```

## Checklist

- [ ] Tipar `body` com Zod (resolvido junto com task 006)
- [ ] Substituir `where.date as object` por tipo Prisma correto
- [ ] Criar interface para notification data
- [ ] Substituir checks manuais de Prisma error por `handlePrismaError` (task 008)
- [ ] Buscar outros `as any` ou `as unknown` no código de API
