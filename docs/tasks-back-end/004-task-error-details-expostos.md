# 004 - Remover detalhes de erro internos das respostas da API

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

Várias rotas retornam `error.message` ou `error.stack` diretamente na resposta JSON. Em produção, isso pode vazar informações internas como:
- Estrutura de tabelas do banco
- Queries SQL que falharam
- Caminhos de arquivo do servidor
- Versões de dependências

## Arquivos afetados

Rotas que expõem `error.message` ou `error.stack` na resposta:

1. `src/app/api/barbers/me/route.ts`
2. `src/app/api/barbers/me/appointments/route.ts`
3. `src/app/api/appointments/route.ts`
4. `src/app/api/appointments/guest/route.ts`
5. `src/app/api/appointments/guest/[id]/feedback/route.ts`
6. `src/app/api/appointments/guest/[id]/cancel/route.ts`
7. `src/app/api/appointments/[id]/no-show/route.ts`
8. `src/app/api/appointments/[id]/feedback/route.ts`
9. `src/app/api/appointments/[id]/cancel/route.ts`
10. `src/app/api/cron/sync-instagram/route.ts`

## Exemplo do problema

```typescript
// ❌ ERRADO — vaza informação interna
return NextResponse.json(
  {
    error: "INTERNAL_ERROR",
    message: "Erro ao buscar perfil",
    details: error instanceof Error ? error.message : String(error),
  },
  { status: 500 }
);
```

## O que corrigir

```typescript
// ✅ CORRETO — log interno, resposta genérica
console.error("Error fetching barber profile:", error);
return NextResponse.json(
  {
    error: "INTERNAL_ERROR",
    message: "Erro ao buscar perfil",
  },
  { status: 500 }
);
```

**Regra:** `error.message` e `error.stack` devem ir apenas para `console.error()` (logs do servidor), nunca para a resposta JSON.

## Checklist

- [ ] Remover `details: error.message` de todas as 10 rotas listadas
- [ ] Remover `error.stack` de respostas (manter apenas em `console.error`)
- [ ] Garantir que `console.error` mantém o log completo para debugging
- [ ] Verificar se não há outros endpoints com o mesmo padrão
- [ ] Testar que erros 500 retornam mensagem genérica sem detalhes internos
