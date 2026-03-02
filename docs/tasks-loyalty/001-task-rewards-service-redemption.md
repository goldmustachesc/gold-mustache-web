# 001 - Criar rewards.service.ts (Lógica de resgate e geração de código)

## Fase: 3 — Resgate de Recompensas (Backend)

## Prioridade: 🔴 ALTA (Feature Core)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O frontend em `rewards/page.tsx` já chama `POST /api/loyalty/redemptions` para resgatar recompensas, mas **não existe nenhum serviço de negócio** que execute a lógica de resgate. O `loyalty.service.ts` expõe `debitPoints` mas não orquestra a validação completa (saldo, estoque, geração de código, expiração).

Também não existe geração de código alfanumérico único para o `Redemption.code`, nem validação de código pelo admin.

## O que implementar

Criar `src/services/loyalty/rewards.service.ts` com as seguintes funções:

### 1. `redeemReward(accountId: string, rewardId: string): Promise<Redemption>`

Orquestra o fluxo completo de resgate:
- Buscar `LoyaltyAccount` e validar saldo (`currentPoints >= reward.pointsCost`)
- Buscar `Reward` e validar: `active === true`, estoque disponível (se `stock !== null`)
- Gerar código único alfanumérico de 6 caracteres (`REDEMPTION_CODE_LENGTH` da config)
- Criar `Redemption` com `expiresAt` = now + `REDEMPTION_VALIDITY_DAYS`
- Debitar pontos via `LoyaltyService.debitPoints`
- Decrementar `stock` se aplicável
- Tudo dentro de uma `prisma.$transaction`

### 2. `generateRedemptionCode(): string`

Gerar código alfanumérico uppercase de 6 caracteres. Garantir unicidade via retry ou check no banco.

### 3. `validateRedemptionCode(code: string): Promise<Redemption & { reward: Reward }>`

Para uso no admin — buscar `Redemption` pelo `code`, incluir `reward` e `loyaltyAccount.profile`. Retornar erro se não encontrado, já usado (`usedAt !== null`), ou expirado.

### 4. `markRedemptionAsUsed(code: string): Promise<Redemption>`

Marcar `usedAt = new Date()`. Validar que não foi usado antes.

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/services/loyalty/__tests__/rewards.service.test.ts` | **Criar PRIMEIRO** — testes unitários |
| `src/services/loyalty/rewards.service.ts` | **Criar** — lógica de resgate |
| `src/services/loyalty/loyalty.service.ts` | Verificar se `debitPoints` atende o fluxo |
| `src/lib/validations/loyalty.ts` | Adicionar schemas Zod para redeem input e code validation |

## Dependências

- `LOYALTY_CONFIG` de `src/config/loyalty.config.ts` (já existem `REDEMPTION_CODE_LENGTH` e `REDEMPTION_VALIDITY_DAYS`)
- Models Prisma `Reward`, `Redemption`, `LoyaltyAccount` (já existem no schema)
- `LoyaltyService.debitPoints` (já implementado)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

Criar `src/services/loyalty/__tests__/rewards.service.test.ts`:

- [ ] **Teste `generateRedemptionCode`**
  - [ ] Deve gerar string de 6 caracteres alfanuméricos uppercase
  - [ ] Deve gerar códigos diferentes em chamadas consecutivas (property test com fast-check)

- [ ] **Testes `redeemReward`**
  - [ ] Deve resgatar com sucesso quando saldo suficiente + reward ativo
  - [ ] Deve retornar erro quando saldo insuficiente (`currentPoints < pointsCost`)
  - [ ] Deve retornar erro quando reward inativo (`active: false`)
  - [ ] Deve retornar erro quando reward sem estoque (`stock === 0`)
  - [ ] Deve decrementar stock quando `stock !== null`
  - [ ] Deve criar Redemption com `expiresAt` correto (now + REDEMPTION_VALIDITY_DAYS)
  - [ ] Deve chamar `debitPoints` com amount correto
  - [ ] Deve executar tudo dentro de `prisma.$transaction`

- [ ] **Testes `validateRedemptionCode`**
  - [ ] Deve retornar redemption + reward quando código válido e pendente
  - [ ] Deve retornar erro quando código não existe
  - [ ] Deve retornar erro quando código já usado (`usedAt !== null`)
  - [ ] Deve retornar erro quando código expirado (`expiresAt < now`)

- [ ] **Testes `markRedemptionAsUsed`**
  - [ ] Deve marcar `usedAt` com data atual
  - [ ] Deve retornar erro quando código já usado (guard double-use)
  - [ ] Deve retornar erro quando código não encontrado

- [ ] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    redemption: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    reward: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: { debitPoints: vi.fn() },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar `src/services/loyalty/rewards.service.ts` com esqueleto das funções
- [ ] Implementar `generateRedemptionCode()` → rodar testes dessa função → GREEN
- [ ] Implementar `redeemReward()` → rodar testes dessa função → GREEN
- [ ] Implementar `validateRedemptionCode()` → rodar testes → GREEN
- [ ] Implementar `markRedemptionAsUsed()` → rodar testes → GREEN
- [ ] Adicionar schemas Zod: `redeemRewardSchema` e `redemptionCodeSchema`
- [ ] Rodar `pnpm test` → TODOS os testes passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Extrair constantes mágicas para `LOYALTY_CONFIG`
- [ ] Revisar tipagem (sem `any`, tipos explícitos nos retornos)
- [ ] Verificar single responsibility — funções pequenas e coesas
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: 🔲 A FAZER
