# Sistema de Fidelidade - Gold Mustache

## Visão Geral

Sistema de pontos e recompensas para incentivar clientes a retornarem e aumentar o ticket médio da barbearia.

---

## 1. Modelo de Pontuação

| Ação | Pontos |
|------|--------|
| Agendamento completado | 10 pontos por R$10 gastos |
| Primeiro agendamento | +50 pontos bônus |
| Aniversário do cliente | +100 pontos |
| Indicação (amigo agenda) | +150 pontos |
| Check-in no local | +20 pontos |
| Avaliação após serviço | +30 pontos |

### Regras de Expiração
- Pontos expiram após **12 meses** sem atividade
- Notificação enviada 30 dias antes da expiração

---

## 2. Níveis de Fidelidade (Tiers)

| Nível | Pontos Acumulados | Benefícios |
|-------|-------------------|------------|
| 🥉 Bronze | 0 - 499 | Acumula pontos normalmente |
| 🥈 Prata | 500 - 1.499 | +10% pontos extras, prioridade no agendamento |
| 🥇 Ouro | 1.500 - 2.999 | +20% pontos extras, 5% desconto em serviços |
| 💎 Diamante | 3.000+ | +30% pontos extras, 10% desconto, serviços exclusivos |

### Regras de Tier
- Tier calculado pelo `lifetimePoints` (pontos totais acumulados)
- Tier nunca diminui (cliente mantém benefícios conquistados)
- Bônus de pontos aplicado automaticamente em cada transação

---

## 3. Catálogo de Recompensas

| Recompensa | Custo (pontos) | Tipo |
|------------|----------------|------|
| Desconto R$10 | 200 | DISCOUNT |
| Desconto R$25 | 450 | DISCOUNT |
| Barba grátis | 500 | FREE_SERVICE |
| Corte grátis | 800 | FREE_SERVICE |
| Combo completo | 1.200 | FREE_SERVICE |
| Produto exclusivo | 600 | PRODUCT |
| Cerveja artesanal | 150 | PRODUCT |

### Regras de Resgate
- Código único gerado para cada resgate
- Validade de **30 dias** após resgate
- Código usado uma única vez na barbearia

---

## 4. Estrutura de Dados (Prisma)

```prisma
// Adicionar ao prisma/schema.prisma

enum LoyaltyTier {
  BRONZE
  SILVER
  GOLD
  DIAMOND
}

enum PointTransactionType {
  EARNED_APPOINTMENT    // Ganhou por agendamento
  EARNED_REFERRAL       // Ganhou por indicação
  EARNED_REVIEW         // Ganhou por avaliação
  EARNED_BIRTHDAY       // Bônus aniversário
  EARNED_BONUS          // Bônus promocional
  REDEEMED              // Resgatou recompensa
  EXPIRED               // Pontos expirados
  ADJUSTED              // Ajuste manual (admin)
}

model LoyaltyAccount {
  id              String      @id @default(uuid())
  profileId       String      @unique @map("profile_id")
  currentPoints   Int         @default(0) @map("current_points")
  lifetimePoints  Int         @default(0) @map("lifetime_points")
  tier            LoyaltyTier @default(BRONZE)
  referralCode    String      @unique @map("referral_code")
  referredById    String?     @map("referred_by_id")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  profile       Profile             @relation(fields: [profileId], references: [id])
  referredBy    LoyaltyAccount?     @relation("Referrals", fields: [referredById], references: [id])
  referrals     LoyaltyAccount[]    @relation("Referrals")
  transactions  PointTransaction[]
  redemptions   Redemption[]

  @@map("loyalty_accounts")
}

model PointTransaction {
  id               String               @id @default(uuid())
  loyaltyAccountId String               @map("loyalty_account_id")
  type             PointTransactionType
  points           Int                  // positivo = ganho, negativo = gasto
  description      String?
  referenceId      String?              @map("reference_id") // appointmentId, visita, etc
  expiresAt        DateTime?            @map("expires_at")
  createdAt        DateTime             @default(now()) @map("created_at")

  loyaltyAccount LoyaltyAccount @relation(fields: [loyaltyAccountId], references: [id])

  @@map("point_transactions")
}

model Reward {
  id          String   @id @default(uuid())
  name        String
  description String?
  pointsCost  Int      @map("points_cost")
  type        String   // DISCOUNT, FREE_SERVICE, PRODUCT
  value       Decimal? @db.Decimal(10, 2) // valor do desconto ou serviço
  serviceId   String?  @map("service_id") // se for serviço grátis
  imageUrl    String?  @map("image_url")
  active      Boolean  @default(true)
  stock       Int?     // null = ilimitado
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  redemptions Redemption[]

  @@map("rewards")
}

model Redemption {
  id               String    @id @default(uuid())
  loyaltyAccountId String    @map("loyalty_account_id")
  rewardId         String    @map("reward_id")
  pointsSpent      Int       @map("points_spent")
  code             String    @unique // código para usar na barbearia
  usedAt           DateTime? @map("used_at")
  expiresAt        DateTime  @map("expires_at")
  createdAt        DateTime  @default(now()) @map("created_at")

  loyaltyAccount LoyaltyAccount @relation(fields: [loyaltyAccountId], references: [id])
  reward         Reward         @relation(fields: [rewardId], references: [id])

  @@map("redemptions")
}
```

### Atualização no Profile

```prisma
model Profile {
  // ... campos existentes
  birthDate     DateTime? @map("birth_date") @db.Date // para bônus aniversário
  loyaltyAccount LoyaltyAccount?
}
```

---

## 5. APIs

### Cliente

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `GET /api/loyalty/account` | GET | Dados da conta (pontos, tier, código) |
| `GET /api/loyalty/transactions` | GET | Histórico de pontos (paginado) |
| `GET /api/loyalty/rewards` | GET | Catálogo de recompensas disponíveis |
| `POST /api/loyalty/redeem` | POST | Resgatar recompensa |
| `GET /api/loyalty/redemptions` | GET | Meus resgates |
| `POST /api/loyalty/referral/validate` | POST | Validar código de indicação |

### Admin

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `GET /api/admin/loyalty/accounts` | GET | Listar contas de fidelidade |
| `POST /api/admin/loyalty/adjust` | POST | Ajustar pontos manualmente |
| `CRUD /api/admin/loyalty/rewards` | ALL | Gerenciar recompensas |
| `POST /api/admin/loyalty/redemptions/use` | POST | Marcar resgate como usado |
| `GET /api/admin/loyalty/reports` | GET | Relatórios de engajamento |

---

## 6. Serviços (src/services/loyalty)

```
src/services/loyalty/
├── loyalty.service.ts        # Lógica principal
├── points.calculator.ts      # Cálculo de pontos
├── tier.calculator.ts        # Cálculo de tier
├── referral.service.ts       # Sistema de indicação
└── rewards.service.ts        # Gerenciamento de recompensas
```

### Funções Principais

```typescript
// loyalty.service.ts
- createLoyaltyAccount(profileId: string): Promise<LoyaltyAccount>
- getAccountByProfileId(profileId: string): Promise<LoyaltyAccount>
- creditPoints(accountId: string, type: PointTransactionType, points: number, referenceId?: string)
- debitPoints(accountId: string, points: number, description: string)
- recalculateTier(accountId: string): Promise<LoyaltyTier>

// points.calculator.ts
- calculateAppointmentPoints(price: Decimal, tier: LoyaltyTier): number
- applyTierBonus(basePoints: number, tier: LoyaltyTier): number

// rewards.service.ts
- redeemReward(accountId: string, rewardId: string): Promise<Redemption>
- validateRedemptionCode(code: string): Promise<Redemption>
- markRedemptionAsUsed(code: string): Promise<void>
```

---

## 7. Fluxos de Integração

### Creditar Pontos após Agendamento

```
Appointment.status → COMPLETED
    ↓
Hook/Trigger detecta mudança
    ↓
Buscar LoyaltyAccount do cliente
    ↓
Calcular pontos: (preço ÷ 10) × 10 + bônus tier
    ↓
Criar PointTransaction (EARNED_APPOINTMENT)
    ↓
Atualizar currentPoints e lifetimePoints
    ↓
Verificar/atualizar tier se necessário
    ↓
Criar Notification para o cliente
```

### Resgate de Recompensa

```
Cliente seleciona recompensa
    ↓
Verificar pontos suficientes
    ↓
Verificar estoque (se aplicável)
    ↓
Debitar pontos (PointTransaction REDEEMED)
    ↓
Gerar código único (6 caracteres alfanuméricos)
    ↓
Criar Redemption com expiresAt (+30 dias)
    ↓
Retornar código para cliente
```

### Sistema de Indicação

```
Cliente A compartilha código de indicação
    ↓
Cliente B se cadastra com código
    ↓
Vincular referredById no LoyaltyAccount de B
    ↓
Quando B completa primeiro agendamento:
    ↓
Creditar 150 pontos para Cliente A
Creditar 50 pontos bônus para Cliente B
```

---

## 8. Componentes UI

### Páginas

```
src/app/(client)/loyalty/
├── page.tsx              # Dashboard principal
├── rewards/page.tsx      # Catálogo de recompensas
├── history/page.tsx      # Histórico de pontos
└── referral/page.tsx     # Página de indicação

src/app/admin/loyalty/
├── page.tsx              # Visão geral
├── accounts/page.tsx     # Gerenciar contas
├── rewards/page.tsx      # Gerenciar recompensas
└── reports/page.tsx      # Relatórios
```

### Componentes

```
src/components/loyalty/
├── LoyaltyCard.tsx           # Card com pontos e tier
├── TierBadge.tsx             # Badge do tier atual
├── PointsHistory.tsx         # Lista de transações
├── RewardCard.tsx            # Card de recompensa
├── RedemptionCode.tsx        # Exibir código de resgate
├── ReferralShare.tsx         # Compartilhar código
└── TierProgress.tsx          # Barra de progresso para próximo tier
```

---

## 9. Notificações

Adicionar novos tipos ao enum `NotificationType`:

```prisma
enum NotificationType {
  // ... existentes
  LOYALTY_POINTS_EARNED      // Pontos creditados
  LOYALTY_TIER_UPGRADE       // Subiu de tier
  LOYALTY_POINTS_EXPIRING    // Pontos vão expirar
  LOYALTY_REWARD_REDEEMED    // Resgate confirmado
  LOYALTY_REFERRAL_BONUS     // Bônus por indicação
  LOYALTY_BIRTHDAY_BONUS     // Bônus de aniversário
}
```

---

## 10. Configurações

```typescript
// src/config/loyalty.config.ts

export const LOYALTY_CONFIG = {
  // Pontuação
  POINTS_PER_CURRENCY: 10,        // 10 pontos por R$10
  CURRENCY_UNIT: 10,              // Unidade de cálculo (R$10)
  
  // Bônus
  FIRST_APPOINTMENT_BONUS: 50,
  BIRTHDAY_BONUS: 100,
  REFERRAL_BONUS: 150,
  REVIEW_BONUS: 30,
  CHECKIN_BONUS: 20,
  
  // Tiers
  TIERS: {
    BRONZE: { min: 0, bonus: 0 },
    SILVER: { min: 500, bonus: 0.10 },
    GOLD: { min: 1500, bonus: 0.20 },
    DIAMOND: { min: 3000, bonus: 0.30 },
  },
  
  // Expiração
  POINTS_EXPIRY_MONTHS: 12,
  EXPIRY_WARNING_DAYS: 30,
  REDEMPTION_VALIDITY_DAYS: 30,
  
  // Código de resgate
  REDEMPTION_CODE_LENGTH: 6,
}
```

---

## 11. Fases de Implementação

### Fase 1 - Base (Estimativa: 2-3 dias)
- [ ] Adicionar models ao Prisma schema
- [ ] Criar e executar migration
- [ ] Criar `src/config/loyalty.config.ts`
- [ ] Implementar `loyalty.service.ts` básico
- [ ] Implementar `points.calculator.ts`

### Fase 2 - APIs Core (Estimativa: 2-3 dias)
- [ ] `GET /api/loyalty/account`
- [ ] `GET /api/loyalty/transactions`
- [ ] `GET /api/loyalty/rewards`
- [ ] Integrar com fluxo de agendamento (creditar pontos)
- [ ] Adicionar novos tipos de notificação

### Fase 3 - Resgate (Estimativa: 2 dias)
- [ ] `POST /api/loyalty/redeem`
- [ ] `GET /api/loyalty/redemptions`
- [ ] Geração de códigos únicos
- [ ] Validação de códigos (admin)

### Fase 4 - Indicação (Estimativa: 1-2 dias)
- [ ] `POST /api/loyalty/referral/validate`
- [ ] Geração de código de indicação no cadastro
- [ ] Fluxo de bônus por indicação

### Fase 5 - UI Cliente (Estimativa: 3-4 dias)
- [ ] Dashboard de fidelidade
- [ ] Catálogo de recompensas
- [ ] Histórico de pontos
- [ ] Página de indicação
- [ ] Componentes reutilizáveis

### Fase 6 - Admin (Estimativa: 2-3 dias)
- [ ] CRUD de recompensas
- [ ] Ajuste manual de pontos
- [ ] Validar/usar códigos de resgate
- [ ] Relatórios básicos

### Fase 7 - Refinamentos (Estimativa: 1-2 dias)
- [ ] Job para expiração de pontos
- [ ] Job para bônus de aniversário
- [ ] Notificações push/email
- [ ] Testes

---

## 12. Métricas de Sucesso

- Taxa de adesão ao programa (% clientes com conta)
- Pontos médios acumulados por cliente
- Taxa de resgate de recompensas
- Retenção de clientes (comparativo antes/depois)
- Ticket médio por tier
- Indicações bem-sucedidas

---

## Referências

- Schema atual: `prisma/schema.prisma`
- Serviços existentes: `src/services/`
- APIs existentes: `src/app/api/`
