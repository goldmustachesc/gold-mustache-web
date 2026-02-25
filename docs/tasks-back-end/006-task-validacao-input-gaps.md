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

- [ ] Criar schema Zod para feedback (rating 1-5, comment max 1000)
- [ ] Aplicar schema nos 2 endpoints de feedback
- [ ] Usar `getAppointmentsQuerySchema` no GET de appointments
- [ ] Criar e aplicar schema para absences (startDate, endDate como ISO date)
- [ ] Criar e aplicar schema para shop-closures (startDate, endDate)
- [ ] Criar e aplicar schema para loyalty adjust (points: number, reason: string)
- [ ] Testar que dados inválidos retornam 400 com mensagem descritiva
- [ ] Testar que dados válidos passam normalmente
