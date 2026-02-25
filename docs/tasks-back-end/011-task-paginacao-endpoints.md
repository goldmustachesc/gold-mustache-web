# 011 - Adicionar paginação em endpoints de listagem

## Prioridade: 🟡 MÉDIA (Performance / Escalabilidade)

## Problema

Vários endpoints retornam **todos os registros** de uma vez, sem paginação. Conforme a barbearia cresce (mais clientes, agendamentos, notificações), essas respostas ficam cada vez maiores, causando:
- Respostas lentas
- Consumo excessivo de memória no servidor
- Transferência de dados desnecessária para o cliente
- Possível timeout em listas grandes

## Endpoints sem paginação

| Endpoint | Arquivo | O que retorna |
|----------|---------|---------------|
| GET `/api/barbers/me/clients` | `src/app/api/barbers/me/clients/route.ts` | Todos os clientes do barbeiro (registered + guest) |
| GET `/api/barbers/me/cancelled-appointments` | `src/app/api/barbers/me/cancelled-appointments/route.ts` | Todos os agendamentos cancelados |
| GET `/api/notifications` | `src/app/api/notifications/route.ts` | Todas as notificações do usuário |
| GET `/api/dashboard/stats` | `src/app/api/dashboard/stats/route.ts` | Todos os agendamentos do cliente |
| GET `/api/admin/feedbacks` | `src/app/api/admin/feedbacks/route.ts` | Todos os feedbacks |

## Proposta

Adicionar query params padrão de paginação:

```typescript
// Query params
?page=1&limit=20

// Resposta padronizada
{
  data: [...],
  meta: {
    total: 150,
    page: 1,
    limit: 20,
    totalPages: 8
  }
}
```

Helper reutilizável:

```typescript
// src/lib/api/pagination.ts
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

## Checklist

- [ ] Criar helper de paginação em `src/lib/api/pagination.ts`
- [ ] Adicionar paginação em `/api/barbers/me/clients`
- [ ] Adicionar paginação em `/api/barbers/me/cancelled-appointments`
- [ ] Adicionar paginação em `/api/notifications`
- [ ] Adicionar paginação em `/api/dashboard/stats`
- [ ] Adicionar paginação em `/api/admin/feedbacks`
- [ ] Atualizar front-end para consumir paginação (ou manter compatibilidade)
- [ ] Testar com `?page=1&limit=10`, `?page=2`, sem params (default)
