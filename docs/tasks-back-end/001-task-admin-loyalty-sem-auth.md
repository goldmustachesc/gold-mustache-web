# 001 - Adicionar autenticação nas rotas admin de fidelidade

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

**TODAS as rotas de admin do módulo de fidelidade estão SEM autenticação.** Qualquer pessoa na internet pode listar, criar, atualizar, deletar recompensas e ajustar pontos de clientes.

Diferente da task 002 (que era apenas um GET), aqui temos **operações de escrita totalmente abertas**.

## Arquivos afetados

| Arquivo | Método | O que faz sem auth |
|---------|--------|--------------------|
| `src/app/api/admin/loyalty/accounts/route.ts` | GET | Lista contas de fidelidade (mock data) |
| `src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts` | POST | Ajusta pontos de cliente (mock, mas aberto) |
| `src/app/api/admin/loyalty/rewards/route.ts` | GET | Lista TODAS recompensas (incluindo inativas) |
| `src/app/api/admin/loyalty/rewards/route.ts` | POST | **Cria recompensas no banco** |
| `src/app/api/admin/loyalty/rewards/[id]/route.ts` | GET | Lê recompensa por ID |
| `src/app/api/admin/loyalty/rewards/[id]/route.ts` | PUT | **Atualiza recompensa no banco** |
| `src/app/api/admin/loyalty/rewards/[id]/route.ts` | DELETE | **Deleta recompensa do banco** |
| `src/app/api/admin/loyalty/rewards/[id]/toggle/route.ts` | PUT | **Ativa/desativa recompensa no banco** |

## O que corrigir

Adicionar `requireAdmin()` em cada handler:

```typescript
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  // ... resto da lógica
}
```

## Nota importante

Os endpoints de `accounts` e `adjust` retornam dados mock. Mesmo assim, devem ser protegidos porque:
- Um atacante poderia descobrir que existem endpoints admin
- Quando o mock for substituído por implementação real, a falha de segurança já existiria

## Checklist

- [x] Adicionar `requireAdmin()` no GET de `/admin/loyalty/accounts`
- [x] Adicionar `requireAdmin()` no POST de `/admin/loyalty/accounts/[accountId]/adjust`
- [x] Adicionar `requireAdmin()` no GET e POST de `/admin/loyalty/rewards`
- [x] Adicionar `requireAdmin()` no GET, PUT, DELETE de `/admin/loyalty/rewards/[id]`
- [x] Adicionar `requireAdmin()` no PUT de `/admin/loyalty/rewards/[id]/toggle`
- [x] Testar acesso sem auth → 401 (coberto via mock `requireAdmin` nos testes unitários)
- [x] Testar acesso com user não-admin → 403 (coberto via mock `requireAdmin` nos testes unitários)
- [x] Testar acesso com admin → sucesso (lint ✅ · types ✅ · build ✅ · 441 testes ✅)

## Status: ✅ CONCLUÍDA
