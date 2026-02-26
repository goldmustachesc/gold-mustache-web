# 006 - Corrigir gaps de validação de input (Zod)

## Prioridade: 🟠 ALTA (Segurança / Robustez)

## Problema

Várias rotas aceitam dados do usuário (body, query params) sem validar com Zod. Dados malformados podem causar erros de runtime, corromper dados no banco, ou permitir injection.

O projeto já tem schemas Zod definidos em `src/lib/validations/`, mas alguns não são usados.

## Arquivos afetados

### 1. Feedback sem validação de range

**`src/app/api/appointments/guest/[id]/feedback/route.ts`** (linha ~91)
**`src/app/api/appointments/[id]/feedback/route.ts`** (linha ~105)

Validação atual: apenas `typeof rating !== "number"`.
Problemas:
- `rating` aceita qualquer número (0, -5, 999)
- `comment` não tem limite de tamanho (poderia enviar megabytes)

```typescript
// ❌ Validação atual
if (!rating || typeof rating !== "number") { ... }

// ✅ Deveria ser
const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
```

### 2. Query params de appointments não validados

**`src/app/api/appointments/route.ts`** (linha ~32)

O schema `getAppointmentsQuerySchema` **existe em `src/lib/validations/booking.ts`** mas **não é usado**. As query params `startDate`, `endDate`, `barberId` são lidas sem validação — datas inválidas causam runtime error em `parseDateStringToUTC()`.

### 3. Datas de ausências sem validação

**`src/app/api/barbers/me/absences/route.ts`** (linha ~46)

`startDate` e `endDate` passadas para `parseDateStringToUTC()` sem schema. Data mal formatada causa crash.

### 4. Datas de shop closures sem validação

**`src/app/api/admin/shop-closures/route.ts`** (linha ~24)

Mesmo problema — `startDate`/`endDate` sem validação.

### 5. Adjust de pontos sem validação nenhuma

**`src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts`** (linha 10)

```typescript
// ❌ Zero validação
const { points, reason } = body;
```

`points` pode ser string, null, negativo sem limite. `reason` pode ser qualquer coisa.

## Checklist

- [x] Criar schema Zod para feedback (rating 1-5, comment max 1000)
- [x] Aplicar schema nos 2 endpoints de feedback
- [x] Usar `getAppointmentsQuerySchema` no GET de appointments
- [x] Criar e aplicar schema para absences (startDate, endDate como ISO date)
- [x] Criar e aplicar schema para shop-closures (startDate, endDate)
- [x] Criar e aplicar schema para loyalty adjust (points: number, reason: string)
- [x] Testar que dados inválidos retornam 400 com mensagem descritiva
- [x] Testar que dados válidos passam normalmente

## Resultado da Implementação

**Status: ✅ CONCLUÍDO**

**Data de conclusão:** 2026-02-26

### Mudanças implementadas

#### Novos arquivos criados
- `src/lib/validations/feedback.ts` — schema `feedbackSchema` (rating int 1–5, comment trim/max 1000, opcional) + tipo `FeedbackInput`
- `src/lib/validations/loyalty.ts` — schema `loyaltyAdjustSchema` (points int ±10 000, refinement ≠0; reason min 1/max 500) + `accountIdSchema` (UUID) + tipo `LoyaltyAdjustInput`

#### Arquivos modificados
- `src/lib/validations/booking.ts` — extraídos `dateRangeFields`, `validateDateRange`, `dateRangeRefineOptions` para reuso; `dateRangeQuerySchema` e `getAppointmentsQuerySchema` compostos independentemente (workaround Zod v4: `.extend()` proibido em schemas com `.refine()`)
- `src/app/api/appointments/route.ts` — integrado `getAppointmentsQuerySchema` no GET; query params inválidas retornam 400
- `src/app/api/barbers/me/absences/route.ts` — integrado `dateRangeQuerySchema` no GET
- `src/app/api/admin/shop-closures/route.ts` — integrado `dateRangeQuerySchema` no GET
- `src/app/api/admin/loyalty/accounts/[accountId]/adjust/route.ts` — integrado `loyaltyAdjustSchema` no body; usa `accountIdSchema` para validar path param `accountId`; error code padronizado para `INTERNAL_ERROR`; import `z` desnecessário removido
- `src/app/api/appointments/[id]/feedback/route.ts` — integrado `feedbackSchema`; validação UUID do path param `id` em GET e POST
- `src/app/api/appointments/guest/[id]/feedback/route.ts` — integrado `feedbackSchema`; validação UUID do path param `id` em GET e POST

### Ciclos de code review

Após a implementação inicial, dois ciclos de code review identificaram e resolveram melhorias adicionais:

**Ciclo 1:**
- Adicionados bounds e refinement `!== 0` ao campo `points` em `loyaltyAdjustSchema`
- `feedbackSchema` extraído para arquivo dedicado `src/lib/validations/feedback.ts`; adicionado `.trim().min(1)` ao `comment`
- Eliminada duplicação de regex; adicionada validação `endDate >= startDate` via refinement compartilhado; corrigida incompatibilidade Zod v4 com `.extend()` em schemas refinados
- Adicionada validação UUID para `accountId` em `adjust/route.ts`

**Ciclo 2:**
- `accountIdSchema` exportado de `loyalty.ts` e centralizado (eliminado inline em `adjust/route.ts`)
- Error code interno padronizado para `INTERNAL_ERROR` em `adjust/route.ts`
- Removido import `z` não utilizado em `adjust/route.ts`
- Validação UUID do `appointmentId` adicionada nos handlers GET e POST de ambas as rotas de feedback

### Verificações finais
| Check | Status |
|-------|--------|
| `pnpm lint` (Biome) | ✅ PASS |
| `pnpm build` (Next.js) | ✅ PASS |
| Issues críticas | 0 |
