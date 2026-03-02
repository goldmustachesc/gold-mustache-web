# 003 - Implementar sistema de indicação (referral service + API + bônus)

## Fase: 4 — Sistema de Indicação (Backend)

## Prioridade: 🟠 ALTA (Feature Core)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O schema Prisma já tem `referralCode` e `referredById` no `LoyaltyAccount`, e a config já define `REFERRAL_BONUS: 150`, mas **não existe nenhuma lógica de negócio implementada** para o fluxo de indicação. O endpoint `POST /api/loyalty/referral/validate` não existe, e o bônus por indicação nunca é creditado.

## O que implementar

### 1. Criar `src/services/loyalty/referral.service.ts`

#### `validateReferralCode(code: string): Promise<LoyaltyAccount>`
- Buscar `LoyaltyAccount` pelo `referralCode`
- Validar que o código existe e pertence a um usuário ativo
- Retornar erro se o código for do próprio usuário

#### `applyReferral(referrerId: string, referredAccountId: string): Promise<void>`
- Vincular `referredById` no account do novo cliente
- Registrar a referência para creditar bônus no futuro (quando o referred completar primeiro agendamento)

#### `creditReferralBonus(referredAccountId: string): Promise<void>`
- Chamado quando o referred completa o primeiro agendamento
- Creditar `REFERRAL_BONUS` (150 pts) para o referrer
- Creditar `FIRST_APPOINTMENT_BONUS` (50 pts) para o referred (se não creditado ainda)
- Criar `PointTransaction` com type `EARNED_REFERRAL` para ambos

### 2. Criar endpoint `POST /api/loyalty/referral/validate`

**Request body:**
```json
{ "code": "ABC123" }
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "referrerName": "João S."
  }
}
```

**Erros:** 400 (código próprio), 404 (código inválido)

### 3. Integrar bônus no fluxo de agendamento

Em `src/services/booking.ts` → `markAppointmentAsCompleted`:
- Após creditar pontos normais, verificar se é o primeiro agendamento do cliente
- Se o `LoyaltyAccount` tem `referredById` e nunca recebeu `EARNED_REFERRAL`, executar `creditReferralBonus`

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/services/loyalty/__tests__/referral.service.test.ts` | **Criar PRIMEIRO** — testes unitários do service |
| `src/app/api/loyalty/referral/validate/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do endpoint |
| `src/services/loyalty/referral.service.ts` | **Criar** — lógica de indicação |
| `src/app/api/loyalty/referral/validate/route.ts` | **Criar** — endpoint de validação |
| `src/services/booking.ts` | **Modificar** — integrar bônus referral no fluxo COMPLETED |
| `src/lib/validations/loyalty.ts` | Adicionar `referralCodeSchema` |

## Regras de negócio

- Um usuário não pode usar seu próprio código de indicação
- O bônus só é creditado uma vez por par (referrer → referred)
- O referred precisa completar pelo menos 1 agendamento para o bônus ser disparado
- O `referralCode` já é gerado automaticamente no `createAccount` do `loyalty.service.ts`

## Dependências

- `LoyaltyService.creditPoints` (já implementado)
- `LOYALTY_CONFIG.REFERRAL_BONUS` e `FIRST_APPOINTMENT_BONUS` (já existem)
- Fluxo de `markAppointmentAsCompleted` em `booking.ts` (já integra com loyalty)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/services/loyalty/__tests__/referral.service.test.ts`

**Testes `validateReferralCode`:**
- [ ] Deve retornar LoyaltyAccount quando código válido existe
- [ ] Deve retornar erro quando código não existe no banco
- [ ] Deve retornar erro quando código é do próprio usuário (self-referral)

**Testes `applyReferral`:**
- [ ] Deve vincular `referredById` no account do referred
- [ ] Deve retornar erro quando referrer não existe
- [ ] Deve retornar erro quando referred já tem `referredById` (já foi indicado)

**Testes `creditReferralBonus`:**
- [ ] Deve creditar REFERRAL_BONUS (150 pts) para o referrer
- [ ] Deve creditar FIRST_APPOINTMENT_BONUS (50 pts) para o referred
- [ ] Deve criar PointTransaction com type EARNED_REFERRAL para ambos
- [ ] Deve NÃO creditar se bônus já foi dado (double-credit guard)
- [ ] Deve NÃO creditar se account não tem `referredById` (não foi indicado)

**Property test (fast-check):**
- [ ] Para qualquer par válido (referrer, referred), o total de pontos creditados é exatamente `REFERRAL_BONUS + FIRST_APPOINTMENT_BONUS`

#### Arquivo: `src/app/api/loyalty/referral/validate/__tests__/route.test.ts`

**Testes `POST /api/loyalty/referral/validate`:**
- [ ] Deve retornar 401 quando não autenticado
- [ ] Deve retornar 400 quando body inválido (sem code)
- [ ] Deve retornar 200 com `valid: true` e nome parcial do referrer
- [ ] Deve retornar 400 quando código é do próprio usuário
- [ ] Deve retornar 404 quando código não existe

- [ ] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
// Service tests
vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn() },
    pointTransaction: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: { creditPoints: vi.fn() },
}));

// Route tests
vi.mock("@/services/loyalty/referral.service", () => ({
  ReferralService: { validateReferralCode: vi.fn(), applyReferral: vi.fn() },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar `src/services/loyalty/referral.service.ts` com esqueleto
- [ ] Implementar `validateReferralCode()` → rodar testes → GREEN
- [ ] Implementar `applyReferral()` → rodar testes → GREEN
- [ ] Implementar `creditReferralBonus()` → rodar testes → GREEN
- [ ] Criar `POST /api/loyalty/referral/validate` → rodar testes → GREEN
- [ ] Integrar `creditReferralBonus` no `markAppointmentAsCompleted` do booking.ts
- [ ] Adicionar `referralCodeSchema` em validations
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar que nome parcial é seguro (não expõe PII além do necessário)
- [ ] Extrair lógica de "primeiro agendamento" em helper testável
- [ ] Verificar tipagem completa (sem `any`)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: 🔲 A FAZER
