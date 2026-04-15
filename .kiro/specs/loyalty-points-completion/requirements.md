# Documento de Requisitos

## Introdução

O sistema de fidelidade já possui configuração (`REVIEW_BONUS: 30`, `CHECKIN_BONUS: 20`) e enum Prisma (`EARNED_REVIEW`) para dois tipos de bônus, mas nenhum code path os concede. Este spec implementa a concessão efetiva desses pontos.

## Glossário

- **EARNED_REVIEW**: Pontos concedidos quando cliente autenticado submete feedback/avaliação
- **CHECKIN_BONUS**: Pontos concedidos por presença confirmada (appointment completado)
- **LoyaltyAccount**: Conta de pontos do cliente no programa de fidelidade
- **Feedback**: Avaliação (1-5 estrelas + comentário opcional) de um appointment completado

## Requisitos

### Requisito 1 — Pontos por Avaliação (EARNED_REVIEW)

**User Story:** Como cliente autenticado, quero receber pontos de fidelidade ao avaliar um atendimento, incentivando feedback constante.

#### Critérios de Aceite

1. WHEN cliente autenticado cria feedback via `createFeedback` THEN sistema SHALL creditar `REVIEW_BONUS` (30) pontos na `LoyaltyAccount` do cliente com tipo `EARNED_REVIEW`
2. WHEN feedback já concedeu pontos para aquele `appointmentId` THEN sistema SHALL NOT creditar pontos duplicados (idempotência via `referenceId`)
3. WHEN cliente não possui `LoyaltyAccount` THEN sistema SHALL criar conta antes de creditar (usando `getOrCreateAccount`)
4. WHEN feature flag `loyaltyProgram` está desabilitada THEN sistema SHALL NOT creditar pontos
5. WHEN guest (não autenticado) cria feedback via `createGuestFeedback` THEN sistema SHALL NOT creditar pontos (guests não têm loyalty account)

### Requisito 2 — Pontos por Check-in (CHECKIN_BONUS)

**User Story:** Como cliente autenticado, quero receber pontos bônus cada vez que meu atendimento é completado, recompensando minha presença.

#### Critérios de Aceite

1. WHEN appointment de cliente autenticado é marcado como COMPLETED THEN sistema SHALL creditar `CHECKIN_BONUS` (20) pontos com tipo `EARNED_CHECKIN`
2. WHEN appointment já concedeu `EARNED_CHECKIN` para aquele `appointmentId` THEN sistema SHALL NOT creditar duplicados (idempotência via `referenceId`)
3. WHEN appointment pertence a guest (sem `clientId`) THEN sistema SHALL NOT creditar pontos
4. WHEN feature flag `loyaltyProgram` está desabilitada THEN sistema SHALL NOT creditar pontos
5. WHEN appointment é completado E `EARNED_APPOINTMENT` (pontos por valor) também é creditado THEN ambos bônus (CHECKIN + APPOINTMENT) SHALL coexistir — são independentes

### Requisito 3 — Enum Prisma

1. IF tipo `EARNED_CHECKIN` não existe no enum `PointTransactionType` THEN schema SHALL ser atualizado com migration
