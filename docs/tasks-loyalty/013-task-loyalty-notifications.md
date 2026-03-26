# 013 - Implementar notificações do programa de fidelidade

## Fase: 7 — Refinamentos

## Prioridade: 🟡 MÉDIA (UX — feedback ao cliente sobre atividade de fidelidade)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O enum `NotificationType` no schema Prisma já define tipos de notificação de fidelidade, mas **nenhum deles é criado em nenhum fluxo** do loyalty system:

- `LOYALTY_POINTS_EARNED` — nunca criado quando pontos são creditados
- `LOYALTY_TIER_UPGRADE` — nunca criado quando tier sobe
- `LOYALTY_POINTS_EXPIRING` — nunca criado como aviso de expiração
- `LOYALTY_REWARD_REDEEMED` — nunca criado quando recompensa é resgatada
- `LOYALTY_REFERRAL_BONUS` — nunca criado quando bônus de indicação é creditado
- `LOYALTY_BIRTHDAY_BONUS` — nunca criado quando bônus de aniversário é creditado

O cliente não recebe nenhum feedback sobre atividades do programa de fidelidade além do que vê navegando pelas páginas.

## O que implementar

### 1. Criar `src/services/loyalty/notification.service.ts`

#### `notifyPointsEarned(profileId: string, points: number, description: string): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_POINTS_EARNED`
- Título: "Pontos creditados!"
- Mensagem: "+{points} pontos — {description}"

#### `notifyTierUpgrade(profileId: string, newTier: LoyaltyTier, previousTier: LoyaltyTier): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_TIER_UPGRADE`
- Título: "Parabéns! Novo nível: {tierName}"
- Mensagem: "Você subiu de {previousTier} para {newTier}!"

#### `notifyRewardRedeemed(profileId: string, rewardName: string, code: string): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_REWARD_REDEEMED`
- Título: "Resgate confirmado!"
- Mensagem: "{rewardName} — Código: {code}"

#### `notifyPointsExpiring(profileId: string, points: number, expiresAt: Date): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_POINTS_EXPIRING`
- Título: "Pontos prestes a expirar"
- Mensagem: "{points} pontos expiram em {date}"

#### `notifyReferralBonus(profileId: string, points: number): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_REFERRAL_BONUS`
- Título: "Bônus de indicação!"
- Mensagem: "+{points} pontos por indicação de amigo"

#### `notifyBirthdayBonus(profileId: string, points: number): Promise<void>`
- Criar `Notification` com tipo `LOYALTY_BIRTHDAY_BONUS`
- Título: "Feliz aniversário!"
- Mensagem: "+{points} pontos de presente de aniversário"

### 2. Integrar nos fluxos existentes

Adicionar chamadas de notificação nos pontos corretos:

| Fluxo | Onde integrar | Notificação |
|-------|--------------|-------------|
| Pontos por agendamento | `booking.ts` → `markAppointmentAsCompleted` | `notifyPointsEarned` |
| Tier upgrade | `loyalty.service.ts` → `recalculateTier` (quando muda) | `notifyTierUpgrade` |
| Resgate de recompensa | `rewards.service.ts` → `redeemReward` | `notifyRewardRedeemed` |
| Aviso de expiração | `expiration.service.ts` → `getExpiringTransactions` (task 011) | `notifyPointsExpiring` |
| Bônus de indicação | `referral.service.ts` → `creditReferralBonus` | `notifyReferralBonus` |
| Bônus de aniversário | `birthday.service.ts` → `creditBirthdayBonuses` (task 012) | `notifyBirthdayBonus` |

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/services/loyalty/__tests__/notification.service.test.ts` | ✅ **Criado** — testes unitários |
| `src/services/loyalty/notification.service.ts` | ✅ **Criado** — service de notificações |
| `src/services/booking.ts` | ✅ **Modificado** — notificação de pontos |
| `src/services/loyalty/loyalty.service.ts` | ✅ **Modificado** — notificar tier upgrade |
| `src/services/loyalty/rewards.service.ts` | ✅ **Modificado** — notificar resgate |
| `src/services/loyalty/referral.service.ts` | ✅ **Modificado** — notificar bônus referral |

## Regras de negócio

- Notificações são fire-and-forget (falha silenciosa — não deve quebrar o fluxo principal)
- Cada notificação usa o `userId` do profile (não o profileId — consistente com o model `Notification`)
- Formato de mensagem em pt-BR (consistente com o tom de voz do Brand Book)
- Notificação de tier upgrade só quando o tier efetivamente muda (não em recálculo sem mudança)
- Notificação de expiração é enviada uma vez (guard via `data` JSON com referenceId)

## Dependências

- `Notification` model (já existe no schema)
- `NotificationType` enum com todos os LOYALTY_* types (já existe)
- Tasks 011 e 012 para integração com expiração e aniversário (opcional — pode integrar depois)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/services/loyalty/__tests__/notification.service.test.ts`

**Testes `notifyPointsEarned`:**
- [x] Deve criar Notification com tipo LOYALTY_POINTS_EARNED
- [x] Deve incluir pontos e descrição na mensagem
- [x] Deve usar userId correto (buscar do profile)

**Testes `notifyTierUpgrade`:**
- [x] Deve criar Notification com tipo LOYALTY_TIER_UPGRADE
- [x] Deve incluir nomes dos tiers na mensagem

**Testes `notifyRewardRedeemed`:**
- [x] Deve criar Notification com tipo LOYALTY_REWARD_REDEEMED
- [x] Deve incluir nome da recompensa e código na mensagem

**Testes `notifyPointsExpiring`:**
- [x] Deve criar Notification com tipo LOYALTY_POINTS_EXPIRING
- [x] Deve incluir quantidade e data formatada na mensagem

**Testes `notifyReferralBonus`:**
- [x] Deve criar Notification com tipo LOYALTY_REFERRAL_BONUS

**Testes `notifyBirthdayBonus`:**
- [x] Deve criar Notification com tipo LOYALTY_BIRTHDAY_BONUS

**Teste de resiliência:**
- [x] Deve não propagar erro se `prisma.notification.create` falhar (fire-and-forget)

- [x] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn() },
    profile: { findUnique: vi.fn() },
  },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [x] Criar `notification.service.ts` com todas as funções
- [x] Rodar testes → GREEN
- [x] Integrar `notifyPointsEarned` no `booking.ts`
- [x] Integrar `notifyTierUpgrade` no `loyalty.service.ts`
- [x] Integrar `notifyRewardRedeemed` no `rewards.service.ts`
- [x] Integrar `notifyReferralBonus` no `referral.service.ts`
- [ ] Integrar `notifyPointsExpiring` no fluxo de expiração (⚠️ pendente — método existe mas não é chamado)
- [x] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [x] Verificar que notificações não impactam performance dos fluxos principais
- [x] Extrair templates de mensagem em constantes
- [x] Verificar tipagem completa (sem `any`)
- [x] Rodar `pnpm test` → continua GREEN
- [x] `pnpm lint` ✅ e `pnpm build` ✅

## Notas de implementação

- Todas as chamadas de notificação devem ser wrapped em try-catch para não quebrar fluxos existentes
- Considerar um helper `safeNotify` que faz o try-catch genérico
- Integração com tasks 011 (expiração) e 012 (aniversário) pode ser feita quando essas tasks forem implementadas

## Status: ⚠️ PARCIAL — falta integração de `notifyPointsExpiring` no fluxo de expiração
