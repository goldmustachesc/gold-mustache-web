# 012 - Implementar job de bônus de aniversário

## Fase: 7 — Refinamentos

## Prioridade: 🟡 MÉDIA (Engagement — feature de retenção)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

A `LOYALTY_CONFIG` define `BIRTHDAY_BONUS: 100` e o schema Prisma tem `Profile.birthDate`, mas **não existe nenhum mecanismo** para creditar pontos de aniversário automaticamente. O enum `PointTransactionType.EARNED_BIRTHDAY` e `NotificationType.LOYALTY_BIRTHDAY_BONUS` existem mas nunca são usados.

## O que implementar

### 1. Criar `src/services/loyalty/birthday.service.ts`

#### `getTodayBirthdays(date?: Date): Promise<ProfileWithLoyalty[]>`
- Buscar `Profile` onde `birthDate` tem mês e dia iguais à data atual
- Incluir `LoyaltyAccount` na query
- Filtrar apenas perfis com LoyaltyAccount ativa

#### `creditBirthdayBonuses(date?: Date): Promise<BirthdayBonusResult>`
- Para cada aniversariante que ainda NÃO recebeu bônus neste ano:
  - Creditar `BIRTHDAY_BONUS` (100 pts) com type `EARNED_BIRTHDAY`
  - Usar `referenceId` = `birthday-{year}` para guard de duplicata anual
  - Recalcular tier se necessário
- Retornar resumo: `{ processedCount, totalPointsCredited, failedCount }`

#### `hasBirthdayBonusThisYear(accountId: string, year: number): Promise<boolean>`
- Verificar se já existe `PointTransaction` com type `EARNED_BIRTHDAY` e `referenceId = birthday-{year}`
- Guard contra double-credit

### 2. Criar API route `POST /api/admin/loyalty/birthday-bonuses`

- Protegido com `requireAdmin`
- Chama `BirthdayService.creditBirthdayBonuses()`
- Retorna resultado com contagem
- Executável via cron job diário

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/services/loyalty/__tests__/birthday.service.test.ts` | ✅ **Criado** — testes unitários |
| `src/app/api/admin/loyalty/birthday-bonuses/__tests__/route.test.ts` | ✅ **Criado** — testes do endpoint |
| `src/services/loyalty/birthday.service.ts` | ✅ **Criado** — lógica de bônus |
| `src/app/api/admin/loyalty/birthday-bonuses/route.ts` | ✅ **Criado** — endpoint admin |

## Regras de negócio

- Bônus creditado uma vez por ano (guard via `referenceId = birthday-{year}`)
- Apenas perfis com `birthDate` preenchido e LoyaltyAccount ativa
- O bônus é creditado no dia do aniversário (mês + dia, ignorando ano)
- `BIRTHDAY_BONUS` = 100 pontos (da config)
- Tier recalculado após crédito (pode subir de tier no aniversário)
- `expiresAt` segue a regra padrão (12 meses após crédito)

## Dependências

- `LOYALTY_CONFIG.BIRTHDAY_BONUS` (já existe)
- `PointTransactionType.EARNED_BIRTHDAY` (já existe no enum Prisma)
- `Profile.birthDate` (já existe no schema)
- `LoyaltyService.creditPoints` e `recalculateTier` (já implementados)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/services/loyalty/__tests__/birthday.service.test.ts`

**Testes `getTodayBirthdays`:**
- [x] Deve retornar perfis cujo birthDate tem mês e dia iguais à data informada
- [x] Deve ignorar perfis sem birthDate
- [x] Deve ignorar perfis sem LoyaltyAccount
- [x] Deve retornar lista vazia quando nenhum aniversariante

**Testes `hasBirthdayBonusThisYear`:**
- [x] Deve retornar true quando já existe transaction EARNED_BIRTHDAY com referenceId `birthday-{year}`
- [x] Deve retornar false quando não existe
- [x] Deve distinguir entre anos diferentes (bônus de 2025 não bloqueia 2026)

**Testes `creditBirthdayBonuses`:**
- [x] Deve creditar BIRTHDAY_BONUS para cada aniversariante elegível
- [x] Deve criar PointTransaction com type EARNED_BIRTHDAY
- [x] Deve usar referenceId `birthday-{year}` para guard
- [x] Deve NÃO creditar se já recebeu bônus neste ano
- [x] Deve recalcular tier após crédito (delegado via `LoyaltyService.creditPoints`)
- [x] Deve retornar resumo com `processedCount`, `totalPointsCredited` e `failedCount`
- [x] Deve não fazer nada quando nenhum aniversariante
- [x] Deve continuar processando demais aniversariantes quando `creditPoints` falha para um
- [x] Deve retornar `failedCount` no resumo

**Property test (fast-check):**
- [x] Para N aniversariantes elegíveis, `totalPointsCredited === N * BIRTHDAY_BONUS`

#### Arquivo: `src/app/api/admin/loyalty/birthday-bonuses/__tests__/route.test.ts`

**Testes `POST /api/admin/loyalty/birthday-bonuses`:**
- [x] Deve retornar 401/403 quando não admin
- [x] Deve retornar 200 com resumo do processamento
- [x] Deve chamar `BirthdayService.creditBirthdayBonuses()`

- [x] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findMany: vi.fn() },
    pointTransaction: { findFirst: vi.fn(), create: vi.fn() },
    loyaltyAccount: { update: vi.fn() },
  },
}));
vi.mock("@/services/loyalty/loyalty.service", () => ({
  LoyaltyService: { creditPoints: vi.fn(), recalculateTier: vi.fn() },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [x] Criar `birthday.service.ts` com esqueleto
- [x] Implementar `getTodayBirthdays()` → rodar testes → GREEN
- [x] Implementar `hasBirthdayBonusThisYear()` → rodar testes → GREEN
- [x] Implementar `creditBirthdayBonuses()` → rodar testes → GREEN
- [x] Criar endpoint `POST /api/admin/loyalty/birthday-bonuses` → rodar testes → GREEN
- [x] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [x] Verificar query de birthDate usa índice eficiente (EXTRACT month/day)
- [x] Verificar tipagem completa (sem `any`)
- [x] Rodar `pnpm test` → continua GREEN
- [x] `pnpm lint` ✅ e `pnpm build` ✅

## Notas de implementação

- Query de birthDate por mês/dia: usar raw query ou Prisma filter com `birthDate` comparison
- Considerar timezone: usar timezone da barbearia (America/Sao_Paulo) para determinar "hoje"
- Execução ideal: cron job diário às 00:05 (após meia-noite)

## Status: ✅ CONCLUÍDO
