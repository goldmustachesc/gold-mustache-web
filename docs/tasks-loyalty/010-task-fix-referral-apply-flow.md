# 010 - Corrigir fluxo de aplicação de indicação (referral apply)

## Fase: 4 — Sistema de Indicação (Fix)

## Prioridade: 🔴 CRÍTICA (Fluxo quebrado — referral nunca é persistido)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O `ReferralService.applyReferral()` existe e está testado, mas **nunca é chamado por nenhuma rota ou código da aplicação**. O endpoint `POST /api/loyalty/referral/validate` apenas valida o código e retorna o nome parcial do referrer — não persiste `referredById` na conta do usuário.

**Consequência:** O fluxo de bônus por indicação em `booking.ts` depende de `account.referredById` estar preenchido (linha 1444). Como nunca é setado, o bônus de 150 pts para o referrer e 50 pts para o referred **nunca é creditado**.

### Código atual (validate endpoint)

```typescript
const referrerAccount = await ReferralService.validateReferralCode(code, account.id);
const referrerName = ReferralService.getPartialName(referrerAccount.profile?.fullName ?? null);
return apiSuccess({ valid: true, referrerName });
// applyReferral NUNCA é chamado
```

### Fluxo esperado

```
1. Cliente insere código → POST /api/loyalty/referral/validate → vê nome do referrer
2. Cliente confirma → POST /api/loyalty/referral/apply → referredById persistido
3. Cliente completa 1º agendamento → creditReferralBonus() dispara → bônus creditado
```

## O que implementar

### 1. Criar endpoint `POST /api/loyalty/referral/apply`

**Request body:**
```json
{ "code": "ABC123" }
```

**Lógica:**
- Autenticar usuário
- Buscar/criar LoyaltyAccount do usuário
- Chamar `ReferralService.validateReferralCode(code, account.id)` (reutiliza validação)
- Chamar `ReferralService.applyReferral(referrerAccount.id, account.id)` (persiste vínculo)
- Retornar sucesso com nome parcial

**Response (200):**
```json
{
  "success": true,
  "data": {
    "applied": true,
    "referrerName": "João S."
  }
}
```

**Erros:** 401 (não autenticado), 400 (código próprio / já indicado), 404 (código inválido)

### 2. Criar hook `useApplyReferral`

Mutation TanStack Query para `POST /api/loyalty/referral/apply`. Deve invalidar query `loyalty/account` após sucesso.

### 3. Atualizar página de referral

Fluxo em 2 passos:
1. Input + "Validar" → mostra nome do referrer (usa `useValidateReferral` existente)
2. Botão "Confirmar Indicação" → chama `useApplyReferral` → persiste vínculo

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/loyalty/referral/apply/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do endpoint |
| `src/hooks/__tests__/useLoyalty.apply-referral.test.tsx` | **Criar PRIMEIRO** — testes do hook |
| `src/app/[locale]/(protected)/loyalty/referral/__tests__/page.test.tsx` | **Modificar PRIMEIRO** — adicionar testes do fluxo apply |
| `src/app/api/loyalty/referral/apply/route.ts` | **Criar** — endpoint de apply |
| `src/hooks/useLoyalty.ts` | **Modificar** — adicionar `useApplyReferral` |
| `src/app/[locale]/(protected)/loyalty/referral/page.tsx` | **Modificar** — adicionar confirm step |
| `src/lib/validations/loyalty.ts` | Reutilizar `referralCodeSchema` existente |

## Regras de negócio

- Um usuário não pode aplicar seu próprio código
- O bônus só será creditado quando o referred completar o 1º agendamento (lógica já existe em `booking.ts`)
- Se `referredById` já está preenchido, retornar erro "já indicado" (guard no `applyReferral`)
- Validate continua como endpoint de consulta (sem side-effects)
- Apply é o endpoint que persiste o vínculo

## Dependências

- `ReferralService.validateReferralCode` (já implementado — task 003)
- `ReferralService.applyReferral` (já implementado — task 003)
- `ReferralService.getPartialName` (já implementado — task 003)
- `referralCodeSchema` (já implementado)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/app/api/loyalty/referral/apply/__tests__/route.test.ts`

**Testes `POST /api/loyalty/referral/apply`:**
- [x] Deve retornar 401 quando não autenticado
- [x] Deve retornar 400 quando body inválido (sem code)
- [x] Deve retornar 200 com `applied: true` e nome parcial do referrer
- [x] Deve chamar `ReferralService.applyReferral` com IDs corretos
- [x] Deve retornar 400 quando código é do próprio usuário
- [x] Deve retornar 400 quando usuário já foi indicado (`referredById` preenchido)
- [x] Deve retornar 404 quando código não existe

#### Arquivo: `src/hooks/__tests__/useLoyalty.apply-referral.test.tsx`

**Testes `useApplyReferral`:**
- [x] Deve chamar `POST /api/loyalty/referral/apply` com o código
- [x] Deve invalidar query `loyalty/account` após sucesso
- [x] Deve retornar erro quando API retorna 400/404

#### Arquivo: `referral/__tests__/page.test.tsx` (modificar existente)

**Testes do fluxo apply:**
- [x] Após validação com sucesso, deve exibir nome do referrer e botão "Confirmar Indicação"
- [x] Ao clicar "Confirmar", deve chamar `useApplyReferral` com o código
- [x] Após apply com sucesso, deve exibir mensagem de confirmação
- [x] Botão "Confirmar" não deve aparecer antes da validação
- [x] Se `referredById` já preenchido, seção "Fui indicado" deve estar desabilitada

- [x] Rodar `pnpm test` → confirmar que testes novos falham (RED)

### Mocks necessários

```typescript
// Route tests
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn() },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: vi.fn() } },
}));
vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: { getOrCreateAccount: vi.fn() },
}));
vi.mock("@/services/loyalty/referral.service", () => ({
  ReferralService: {
    validateReferralCode: vi.fn(),
    applyReferral: vi.fn(),
    getPartialName: vi.fn(),
  },
}));

// Hook tests — usar vi.hoisted
const mockApplyReferral = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useLoyalty", () => ({
  useApplyReferral: () => ({ mutate: mockApplyReferral, isPending: false }),
  useValidateReferral: () => ({ mutate: vi.fn(), isPending: false }),
  useLoyaltyAccount: () => ({ data: mockAccount, isLoading: false }),
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [x] Criar `src/app/api/loyalty/referral/apply/route.ts` → rodar testes → GREEN
- [x] Criar hook `useApplyReferral` em `useLoyalty.ts` → rodar testes → GREEN
- [x] Atualizar referral page com fluxo validate → confirm → apply → rodar testes → GREEN
- [x] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [x] Verificar que validate endpoint NÃO foi modificado (read-only)
- [x] Verificar tipagem completa (sem `any`)
- [x] Verificar UX: loading states no botão confirm, disabled após apply
- [x] Rodar `pnpm test` → continua GREEN
- [x] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
