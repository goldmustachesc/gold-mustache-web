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
- Retornar resumo: `{ processedCount, totalPointsCredited }`

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
| `src/services/loyalty/__tests__/birthday.service.test.ts` | **Criar PRIMEIRO** — testes unitários |
| `src/app/api/admin/loyalty/birthday-bonuses/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do endpoint |
| `src/services/loyalty/birthday.service.ts` | **Criar** — lógica de bônus |
| `src/app/api/admin/loyalty/birthday-bonuses/route.ts` | **Criar** — endpoint admin |

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
- [ ] Deve retornar perfis cujo birthDate tem mês e dia iguais à data informada
- [ ] Deve ignorar perfis sem birthDate
- [ ] Deve ignorar perfis sem LoyaltyAccount
- [ ] Deve retornar lista vazia quando nenhum aniversariante

**Testes `hasBirthdayBonusThisYear`:**
- [ ] Deve retornar true quando já existe transaction EARNED_BIRTHDAY com referenceId `birthday-{year}`
- [ ] Deve retornar false quando não existe
- [ ] Deve distinguir entre anos diferentes (bônus de 2025 não bloqueia 2026)

**Testes `creditBirthdayBonuses`:**
- [ ] Deve creditar BIRTHDAY_BONUS para cada aniversariante elegível
- [ ] Deve criar PointTransaction com type EARNED_BIRTHDAY
- [ ] Deve usar referenceId `birthday-{year}` para guard
- [ ] Deve NÃO creditar se já recebeu bônus neste ano
- [ ] Deve recalcular tier após crédito
- [ ] Deve retornar resumo com `processedCount` e `totalPointsCredited`
- [ ] Deve não fazer nada quando nenhum aniversariante

**Property test (fast-check):**
- [ ] Para N aniversariantes elegíveis, `totalPointsCredited === N * BIRTHDAY_BONUS`

#### Arquivo: `src/app/api/admin/loyalty/birthday-bonuses/__tests__/route.test.ts`

**Testes `POST /api/admin/loyalty/birthday-bonuses`:**
- [ ] Deve retornar 401/403 quando não admin
- [ ] Deve retornar 200 com resumo do processamento
- [ ] Deve chamar `BirthdayService.creditBirthdayBonuses()`

- [ ] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

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

- [ ] Criar `birthday.service.ts` com esqueleto
- [ ] Implementar `getTodayBirthdays()` → rodar testes → GREEN
- [ ] Implementar `hasBirthdayBonusThisYear()` → rodar testes → GREEN
- [ ] Implementar `creditBirthdayBonuses()` → rodar testes → GREEN
- [ ] Criar endpoint `POST /api/admin/loyalty/birthday-bonuses` → rodar testes → GREEN
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar query de birthDate usa índice eficiente (EXTRACT month/day)
- [ ] Verificar tipagem completa (sem `any`)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Notas de implementação

- Query de birthDate por mês/dia: usar raw query ou Prisma filter com `birthDate` comparison
- Considerar timezone: usar timezone da barbearia (America/Sao_Paulo) para determinar "hoje"
- Execução ideal: cron job diário às 00:05 (após meia-noite)

## Status: 🔲 A FAZER
