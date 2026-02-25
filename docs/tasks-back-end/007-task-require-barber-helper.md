# 007 - Criar helper requireBarber() centralizado

## Prioridade: 🟠 ALTA (Arquitetura)

## Problema

O projeto tem um `requireAdmin()` bem feito em `src/lib/auth/requireAdmin.ts`, mas **não existe equivalente para barbeiros**. Cada rota em `/api/barbers/me/` repete manualmente a mesma lógica:

1. Criar cliente Supabase
2. Buscar usuário autenticado
3. Verificar se existe
4. Buscar barbeiro pelo `userId`
5. Verificar se é barbeiro ativo

Essa lógica está **duplicada em 12 arquivos**.

## Arquivos com lógica duplicada

1. `src/app/api/barbers/me/route.ts`
2. `src/app/api/barbers/me/appointments/route.ts`
3. `src/app/api/barbers/me/working-hours/route.ts`
4. `src/app/api/barbers/me/financial/route.ts`
5. `src/app/api/barbers/me/feedbacks/route.ts`
6. `src/app/api/barbers/me/feedbacks/stats/route.ts`
7. `src/app/api/barbers/me/clients/route.ts`
8. `src/app/api/barbers/me/clients/[id]/route.ts`
9. `src/app/api/barbers/me/clients/[id]/appointments/route.ts`
10. `src/app/api/barbers/me/cancelled-appointments/route.ts`
11. `src/app/api/barbers/me/absences/route.ts`
12. `src/app/api/barbers/me/absences/[id]/route.ts`

## O que criar

Novo arquivo: `src/lib/auth/requireBarber.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type RequireBarberResult =
  | {
      ok: true;
      userId: string;
      barberId: string;
      barberName: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireBarber(): Promise<RequireBarberResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  const barber = await prisma.barber.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, isActive: true },
  });

  if (!barber) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Acesso restrito a barbeiros" },
        { status: 403 }
      ),
    };
  }

  if (!barber.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Barbeiro inativo" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    barberId: barber.id,
    barberName: barber.name,
  };
}
```

## Uso nas rotas

```typescript
// Antes (repetido em cada arquivo):
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) { return ... }
const barber = await prisma.barber.findUnique({ where: { userId: user.id } });
if (!barber) { return ... }

// Depois (uma linha):
const auth = await requireBarber();
if (!auth.ok) return auth.response;
// auth.barberId, auth.userId, auth.barberName disponíveis
```

## Checklist

- [ ] Criar `src/lib/auth/requireBarber.ts`
- [ ] Refatorar todas as 12 rotas de barbeiro para usar o novo helper
- [ ] Garantir que `isActive` é verificado (algumas rotas podem não checar)
- [ ] Testar acesso sem auth → 401
- [ ] Testar acesso com user que não é barbeiro → 403
- [ ] Testar acesso com barbeiro inativo → 403
- [ ] Testar acesso com barbeiro ativo → sucesso
