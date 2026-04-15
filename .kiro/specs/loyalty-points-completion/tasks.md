# Plano de Implementação

- [x] 1. Schema e migration
  - [x] 1.1 Adicionar `EARNED_CHECKIN` ao enum `PointTransactionType` no `prisma/schema.prisma`
  - [x] 1.2 Gerar Prisma client (`pnpm prisma generate`)
  - [x] 1.3 Verificar `EARNED_REVIEW` já existe no schema (confirmado)
  _Requirements: 3.1_

- [x] 2. Helper de idempotência
  - [x] 2.1 Criar `hasExistingTransaction(referenceId, type)` em `loyalty.service.ts`
  - [x] 2.2 Escrever testes para `hasExistingTransaction` (true/false cases)
  - [x] 2.3 Exportar no objeto `LoyaltyService`
  _Requirements: 1.2, 2.2_

- [x] 3. EARNED_REVIEW — integração com feedback
  - [x] 3.1 Escrever teste: `createFeedback` credita REVIEW_BONUS quando loyaltyProgram ativo
  - [x] 3.2 Escrever teste: `createFeedback` NÃO credita quando flag desabilitada
  - [x] 3.3 Escrever teste: `createFeedback` NÃO credita duplicado (idempotência)
  - [x] 3.4 Escrever teste: `createGuestFeedback` NÃO credita pontos
  - [x] 3.5 Implementar integração em `feedback.ts` → `createFeedback()`
  - [x] 3.6 Verificar testes passam (42/42)
  _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. EARNED_CHECKIN — integração com completion
  - [x] 4.1 Escrever teste: `completeAppointment` credita CHECKIN_BONUS quando client autenticado
  - [x] 4.2 Escrever teste: `completeAppointment` NÃO credita para guest
  - [x] 4.3 Escrever teste: `completeAppointment` NÃO credita duplicado
  - [x] 4.4 Escrever teste: CHECKIN + APPOINTMENT coexistem
  - [x] 4.5 Implementar integração em `booking.ts` → `completeAppointment()`
  - [x] 4.6 Verificar testes passam (10/10)
  _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Validação final
  - [x] 5.1 `pnpm test` — 2649 passed (4 falhas pré-existentes não relacionadas)
  - [x] 5.2 `pnpm biome check` — sem erros
  - [x] 5.3 `pnpm build` — build passa
