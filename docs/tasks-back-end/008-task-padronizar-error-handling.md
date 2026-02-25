# 008 - Padronizar tratamento de erros com handlePrismaError

## Prioridade: 🟠 ALTA (Arquitetura)

## Problema

Existe um handler bem construído em `src/lib/api/prisma-error-handler.ts` que:
- Mapeia erros Prisma para HTTP status corretos (409, 404, 503, etc.)
- Retorna mensagens amigáveis em português
- Diferencia tipos de erro (constraint, validation, connection)

Porém, ele é usado em **apenas 2 rotas**:
- `src/app/api/admin/services/route.ts` ✅
- `src/app/api/admin/services/[id]/route.ts` ✅

Todas as outras ~56 rotas fazem tratamento manual com `console.error` + `NextResponse.json({ error: "INTERNAL_ERROR" })`, perdendo a granularidade de erros específicos do Prisma.

## O que corrigir

Substituir os blocos `catch` genéricos pelo `handlePrismaError`:

```typescript
// ❌ Antes (genérico, perde informação)
catch (error) {
  console.error("Error:", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Erro interno" },
    { status: 500 }
  );
}

// ✅ Depois (específico, informativo)
catch (error) {
  return handlePrismaError(error, "Erro ao processar operação");
}
```

## Benefícios

- **P2002 (unique constraint):** retorna 409 em vez de 500 genérico
- **P2025 (not found):** retorna 404 em vez de 500
- **P2024 (timeout):** retorna 503 com mensagem "tente novamente"
- **Validation error:** retorna 400 em vez de 500

## Rotas para atualizar

Todas as rotas em `src/app/api/` que fazem operações Prisma e usam catch genérico. Priorizar:

### Alta prioridade (operações de escrita)
- Todas as rotas em `api/admin/` (settings, shop-hours, shop-closures, barbers, loyalty)
- Todas as rotas em `api/appointments/`
- Todas as rotas em `api/barbers/me/`
- `api/profile/me/`
- `api/consent/`

### Média prioridade (operações de leitura)
- `api/slots/`
- `api/services/`
- `api/barbers/`
- `api/notifications/`
- `api/loyalty/`
- `api/dashboard/stats/`

## Checklist

- [ ] Importar `handlePrismaError` em todas as rotas admin
- [ ] Substituir catch genérico em rotas de agendamento
- [ ] Substituir catch genérico em rotas de barbeiro
- [ ] Substituir catch genérico em rotas de perfil
- [ ] Substituir catch genérico em rotas de leitura
- [ ] Manter `console.error` dentro do `handlePrismaError` (já faz isso)
- [ ] Testar que erros P2002 retornam 409
- [ ] Testar que erros P2025 retornam 404
- [ ] Testar que erros genéricos retornam 500 sem detalhes
