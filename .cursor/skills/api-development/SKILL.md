---
name: api-development
description: Guia para desenvolvimento de rotas API REST no Next.js App Router com Prisma e Supabase. Use quando o usuário quiser criar endpoints, route handlers, ou trabalhar com a API do projeto.
---

# API Development - Gold Mustache

## Instruções

Siga este guia ao criar ou modificar rotas API:

### Estrutura de Route Handlers

Rotas ficam em `src/app/api/`:

```
src/app/api/
├── auth/              # Autenticação (login, signup, callback)
├── barbers/           # CRUD e operações de barbeiros
├── bookings/          # Agendamentos (criar, listar, cancelar)
├── services/          # Serviços da barbearia
├── loyalty/           # Programa de fidelidade
├── feedback/          # Avaliações
├── admin/             # Rotas administrativas
├── cron/              # Jobs agendados
└── profile/           # Perfil do usuário e LGPD
```

### Template de Route Handler

```typescript
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/api/prisma-error-handler";
import { z } from "zod";

const requestSchema = z.object({
  field: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("UNAUTHORIZED", "Não autorizado", 401);
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.flatten());
    }

    const result = await prisma.model.create({
      data: { ...parsed.data },
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handlePrismaError(error, "Erro ao criar recurso");
  }
}
```

### Padrões Obrigatórios

#### 1. Autenticação

Toda rota protegida deve verificar a sessão Supabase:

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return apiError("UNAUTHORIZED", "Não autorizado", 401);
}
```

#### 2. Autorização por Role

Para rotas admin/barbeiro:

```typescript
const profile = await prisma.profile.findUnique({
  where: { userId: user.id },
  select: { role: true },
});

if (profile?.role !== "ADMIN") {
  return apiError("FORBIDDEN", "Acesso negado", 403);
}
```

#### 3. Validação com Zod

Todo input deve ser validado:

```typescript
const schema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dateTime: z.string().datetime(),
});

const parsed = schema.safeParse(body);
if (!parsed.success) {
  return apiError("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.flatten());
}
```

#### 4. Tratamento de Erros

Use o handler centralizado quando disponível (`src/lib/api/prisma-error-handler.ts`):

```typescript
import { handlePrismaError } from "@/lib/api/prisma-error-handler";

try {
  // operação
} catch (error) {
  return handlePrismaError(error);
}
```

#### 5. Prisma Queries Otimizadas

Sempre use `select` ou `include` mínimos:

```typescript
// EVITE: retorna todos os campos
const barber = await prisma.barber.findUnique({ where: { id } });

// PREFIRA: apenas campos necessários
const barber = await prisma.barber.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    photoUrl: true,
    services: { select: { id: true, name: true } },
  },
});
```

### HTTP Status Codes

| Status | Quando usar |
|--------|-------------|
| `200` | Sucesso em GET/PUT/PATCH |
| `201` | Recurso criado (POST) |
| `204` | Sucesso sem corpo (DELETE) |
| `400` | Input inválido |
| `401` | Não autenticado |
| `403` | Sem permissão |
| `404` | Recurso não encontrado |
| `409` | Conflito (slot já ocupado, duplicata) |
| `429` | Rate limit excedido |
| `500` | Erro interno |

### Formato de Resposta Padronizado

**OBRIGATÓRIO**: Use os helpers de `src/lib/api/response.ts` para todas as respostas.

```typescript
import { apiSuccess, apiError, apiMessage, apiCollection } from "@/lib/api/response";

// Sucesso com dados
return apiSuccess(barber);           // → { data: {...} }
return apiSuccess(barbers);          // → { data: [...] }
return apiSuccess(barber, 201);      // → { data: {...} } com status 201

// Sucesso com paginação
return apiCollection(items, { total, page, limit }); // → { data: [...], meta: {...} }

// Sucesso sem corpo (delete, toggle, mark-read)
return apiMessage();                               // → { success: true }
return apiMessage("Recurso removido com sucesso"); // → { success: true, message: "..." }

// Erro
return apiError("UNAUTHORIZED", "Não autorizado", 401);
return apiError("VALIDATION_ERROR", "Dados inválidos", 400, parsed.error.flatten());
return apiError("NOT_FOUND", "Recurso não encontrado", 404);
```

**NÃO use** `NextResponse.json()` diretamente para respostas de sucesso ou erro.

### Rotas de CRON

Para jobs agendados em `src/app/api/cron/`:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("UNAUTHORIZED", "Não autorizado", 401);
  }
  // lógica do cron
}
```

### Checklist

- [ ] Autenticação verificada
- [ ] Autorização por role (se necessário)
- [ ] Input validado com Zod
- [ ] Erros tratados com try/catch
- [ ] Status codes HTTP corretos
- [ ] Prisma queries com select mínimo
- [ ] Sem dados sensíveis expostos
- [ ] Sem `console.log` (exceto errors)
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
