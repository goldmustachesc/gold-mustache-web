# 008 - Padronizar tratamento de erros com handlePrismaError

## Status: ✅ CONCLUÍDA

## Prioridade: 🟠 ALTA (Arquitetura)

## Problema

Existia um handler bem construído em `src/lib/api/prisma-error-handler.ts` que:
- Mapeia erros Prisma para HTTP status corretos (409, 404, 503, etc.)
- Retorna mensagens amigáveis em português
- Diferencia tipos de erro (constraint, validation, connection)

Porém, ele era usado em **apenas 2 rotas**:
- `src/app/api/admin/services/route.ts`
- `src/app/api/admin/services/[id]/route.ts`

Todas as outras ~55 rotas faziam tratamento manual com `console.error` + `NextResponse.json({ error: "INTERNAL_ERROR" })`, perdendo a granularidade de erros específicos do Prisma.

## Solução implementada

### 1. Migração de todas as rotas para `handlePrismaError`

55 rotas API foram atualizadas em 3 grupos:

- **Grupo 1 (catch genérico simples):** `console.error` + `NextResponse 500` substituídos por `handlePrismaError(error, "mensagem contextual")`
- **Grupo 2 (domain errors + catch genérico):** Erros de domínio refatorados para `domainErrors` maps com formato padronizado, `handlePrismaError` como fallback final
- **Grupo 3 (Zod + Prisma manual):** Validação Zod preservada, checks manuais de Prisma substituídos por `handlePrismaError`

### 2. Domain error maps padronizados

Todas as 7 rotas com erros de domínio usam formato consistente:

```typescript
const domainErrors: Record<string, { status: number; error: string; message: string }> = {
  SLOT_IN_PAST: { status: 400, error: "SLOT_IN_PAST", message: "..." },
  // ...
};
const mapped = domainErrors[error.message];
if (mapped) {
  return NextResponse.json(
    { error: mapped.error, message: mapped.message },
    { status: mapped.status },
  );
}
return handlePrismaError(error, "Erro ao ...");
```

### 3. P2002 (race condition) nas rotas de booking

As 3 rotas de criação de agendamento mantêm interceptação explícita de `Prisma.PrismaClientKnownRequestError` com `error.code === "P2002"` para retornar `{ error: "SLOT_OCCUPIED" }` (status 409), preservando o contrato com o frontend (`useBooking.ts`).

- `src/app/api/appointments/route.ts`
- `src/app/api/appointments/guest/route.ts`
- `src/app/api/barbers/me/appointments/route.ts`

### 4. Error codes originais preservados

Error codes que o frontend consome foram mantidos inalterados:
- `SLOT_OCCUPIED` (booking race condition)
- `NOT_FOUND` (cancel autenticado: `APPOINTMENT_NOT_FOUND` → `error: "NOT_FOUND"`)
- `FORBIDDEN`, `CONFLICT`, `PRECONDITION_FAILED` (no-show route)

## Benefícios obtidos

- **P2002 (unique constraint):** retorna 409 em vez de 500 genérico
- **P2025 (not found):** retorna 404 em vez de 500
- **P2024 (timeout):** retorna 503 com mensagem "tente novamente"
- **P1001 (connection):** retorna 503
- **Validation error:** retorna 400 em vez de 500
- **Logging centralizado:** `console.error` removido das rotas, mantido dentro do handler

## Rotas atualizadas

### Admin (17 rotas)
- `api/admin/settings/` (GET, PUT)
- `api/admin/shop-hours/` (PUT)
- `api/admin/shop-closures/` (GET, POST) e `[id]/` (DELETE)
- `api/admin/barbers/` (GET, POST), `[id]/` (GET, PUT, DELETE), `[id]/working-hours/` (PUT), `[id]/feedbacks/` (GET), `ranking/` (GET)
- `api/admin/feedbacks/` (GET), `stats/` (GET)
- `api/admin/financial/` (GET)
- `api/admin/loyalty/accounts/` (GET), `[accountId]/adjust/` (POST)
- `api/admin/loyalty/rewards/` (GET, POST), `[id]/` (GET, PUT, DELETE), `[id]/toggle/` (PUT)

### Appointments (10 rotas)
- `api/appointments/` (GET, POST)
- `api/appointments/[id]/cancel/` (PATCH)
- `api/appointments/[id]/feedback/` (GET, POST)
- `api/appointments/[id]/no-show/` (PATCH)
- `api/appointments/[id]/reminder/` (POST)
- `api/appointments/guest/` (POST)
- `api/appointments/guest/[id]/cancel/` (PATCH)
- `api/appointments/guest/[id]/feedback/` (GET, POST)
- `api/appointments/guest/lookup/` (GET)

### Barbers (14 rotas)
- `api/barbers/` (GET)
- `api/barbers/me/` (GET, PATCH)
- `api/barbers/me/working-hours/` (GET, PUT)
- `api/barbers/me/absences/` (GET, POST), `[id]/` (DELETE)
- `api/barbers/me/appointments/` (GET, POST)
- `api/barbers/me/cancelled-appointments/` (GET)
- `api/barbers/me/clients/` (GET), `[id]/` (GET), `[id]/appointments/` (GET)
- `api/barbers/me/feedbacks/` (GET), `stats/` (GET)
- `api/barbers/me/financial/` (GET)

### Outros (14 rotas)
- `api/consent/` (POST)
- `api/cron/cleanup-guests/` (GET)
- `api/dashboard/stats/` (GET)
- `api/guest/delete-request/` (POST)
- `api/loyalty/account/` (GET)
- `api/loyalty/rewards/` (GET)
- `api/loyalty/transactions/` (GET)
- `api/notifications/` (GET), `[id]/read/` (PATCH), `mark-all-read/` (PATCH)
- `api/profile/delete/` (DELETE)
- `api/profile/export/` (GET)
- `api/profile/me/` (GET, PATCH)
- `api/services/` (GET)
- `api/slots/` (GET)

## Checklist

- [x] Importar `handlePrismaError` em todas as rotas
- [x] Substituir catch genérico em rotas admin (17 rotas)
- [x] Substituir catch genérico em rotas de agendamento (10 rotas)
- [x] Substituir catch genérico em rotas de barbeiro (14 rotas)
- [x] Substituir catch genérico em rotas de perfil, loyalty, notifications, etc. (14 rotas)
- [x] Padronizar domain error maps com formato `{ status, error, message }`
- [x] Preservar interceptação P2002 → SLOT_OCCUPIED nas rotas de booking
- [x] Preservar error codes consumidos pelo frontend
- [x] Manter `console.error` centralizado dentro do `handlePrismaError`
- [x] Atualizar teste `admin/loyalty/rewards` para novo formato de resposta
- [x] `pnpm lint` passa
- [x] `pnpm test` passa (441 testes, 56 arquivos)
- [x] `pnpm build` passa

## Sugestoes pendentes (baixa prioridade)

Identificadas no code review final, nao bloqueiam merge:

1. **`admin/shop-hours` GET sem try/catch** - O handler GET nao protege a chamada Prisma com try/catch (o PUT do mesmo arquivo ja usa)
2. **Inconsistencia `APPOINTMENT_NOT_FOUND` entre cancel autenticado e guest** - Cancel autenticado retorna `error: "NOT_FOUND"`, guest retorna `error: "APPOINTMENT_NOT_FOUND"`
3. **Status HTTP para UNAUTHORIZED no cancel autenticado** - Usa 401 (nao autenticado) quando 403 (proibido) seria mais correto semanticamente
4. **Mensagem em ingles no toggle route** - `"Invalid request body"` em vez de `"Dados invalidos"`
5. **Naming `errorMap` vs `domainErrors`** - Feedback routes usam `errorMap`, cancel/no-show usam `domainErrors`
