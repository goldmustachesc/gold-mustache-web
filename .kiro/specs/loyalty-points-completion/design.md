# Design — Loyalty Points Completion

## Overview

Integrar concessão de `EARNED_REVIEW` e `EARNED_CHECKIN` nos fluxos existentes de feedback e completion, seguindo padrão já usado por `EARNED_APPOINTMENT` em `booking.ts`.

## Arquitetura

Sem novos endpoints. Integração direta nos services existentes:

```
createFeedback() ──► creditPoints(EARNED_REVIEW)
                      └── idempotência: referenceId = feedbackId

completeAppointment() ──► creditPoints(EARNED_CHECKIN)  [NOVO]
                      └── creditPoints(EARNED_APPOINTMENT) [JÁ EXISTE]
```

## Mudanças

### 1. Prisma Schema

Adicionar `EARNED_CHECKIN` ao enum `PointTransactionType` (já existe `EARNED_REVIEW`).

### 2. `src/services/feedback.ts` — `createFeedback()`

Após criar feedback com sucesso:
- Verificar feature flag `loyaltyProgram`
- Obter/criar `LoyaltyAccount` via `getOrCreateAccount(clientId)`
- Chamar `creditPoints({ type: 'EARNED_REVIEW', points: LOYALTY_CONFIG.REVIEW_BONUS, referenceId: feedback.id })`
- Idempotência: checar se já existe transaction com `referenceId` = feedbackId antes de creditar
- Wrap em try/catch — falha na concessão de pontos não deve bloquear feedback

### 3. `src/services/booking.ts` — `completeAppointment()`

No bloco onde `EARNED_APPOINTMENT` já é creditado:
- Adicionar `creditPoints({ type: 'EARNED_CHECKIN', points: LOYALTY_CONFIG.CHECKIN_BONUS, referenceId: appointmentId })`
- Mesmo guard de feature flag e `clientId` que já existe para `EARNED_APPOINTMENT`

### 4. Helper de idempotência

Criar helper em `src/services/loyalty/loyalty.service.ts`:
```typescript
async function hasExistingTransaction(referenceId: string, type: PointTransactionType): Promise<boolean>
```
Usar em ambos os pontos de integração.

## Decisões

- **Guest feedback não ganha pontos**: guests não têm `LoyaltyAccount`, e criar uma sem auth não faz sentido
- **CHECKIN é separado de APPOINTMENT**: APPOINTMENT é proporcional ao valor do serviço, CHECKIN é fixo por presença. Ambos coexistem.
- **Falha silenciosa**: erro na concessão de pontos não bloqueia operação principal (feedback/completion)
