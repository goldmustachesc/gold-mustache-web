# Plano de Implementacao - Booking Reschedule

Todas as tarefas seguem TDD (RED -> GREEN -> REFACTOR). Marque `[ ]` -> `[x]` conforme concluir. Tarefas em ordem estrita de dependencia (de baixo para cima: schema -> lib puro -> service -> route -> UI -> integracao).

## 1. Prisma schema + migration

- [ ] 1.1 Escrever teste de schema garantindo `AppointmentReschedule` e enum `AppointmentActor`
  - Arquivo: `prisma/__tests__/appointment-reschedule.schema.test.ts` (ou integracao via vitest + prisma-test-utils)
  - Property: "Appointment.reschedules round-trip" (grava 2 reschedules, le em ordem)
  - _Requirements: 7.1, 7.2_
- [ ] 1.2 Adicionar model `AppointmentReschedule` + enum `AppointmentActor` em `prisma/schema.prisma`
  - Acrescentar relacao inversa `reschedules AppointmentReschedule[]` em `model Appointment` (`prisma/schema.prisma:208`)
  - Indices: `@@index([appointmentId])`, `@@index([actorUserId])`, `@@index([createdAt])`
  - _Requirements: 7.1_
- [ ] 1.3 Gerar migration `pnpm prisma migrate dev --name add_appointment_reschedules`
- [ ] 1.4 Rodar `pnpm prisma generate` e validar typecheck
  - _Requirements: 7.1_

## 2. Ajuste do helper `hasOverlappingAppointment` (RED primeiro)

- [ ] 2.1 Teste unit em `src/services/__tests__/booking.has-overlapping.test.ts`
  - Caso A: overlap real entre dois appointments distintos -> `true`
  - Caso B: o UNICO overlap e com `excludeAppointmentId == id` -> `false`
  - Caso C: sem conflito -> `false`
  - _Requirements: 4.3_
- [ ] 2.2 Alterar assinatura de `hasOverlappingAppointment` em `src/services/booking.ts:226` para aceitar `excludeAppointmentId?: string` como ultimo parametro opcional
  - Adicionar `id: { not: excludeAppointmentId }` ao `where` quando presente
  - _Requirements: 4.3_
- [ ] 2.3 Verificar que os call sites atuais (create + createGuest + createByBarber) continuam passando nos testes existentes (sem regressao)
  - _Requirements: 4.3_

## 3. Validations (Zod)

- [ ] 3.1 Teste em `src/lib/validations/__tests__/reschedule.test.ts`
  - Payload valido passa
  - `newStartTime` fora de regex -> falha com mensagem pt-BR
  - `newBarberId` nao UUID -> falha
  - `actor` invalido -> falha
  - _Requirements: 1.1, 3.1_
- [ ] 3.2 Adicionar `rescheduleAppointmentSchema` e `rescheduleGuestAppointmentSchema` em `src/lib/validations/booking.ts`
  - Exportar tipos `RescheduleAppointmentPayload`, `RescheduleGuestAppointmentPayload`
  - _Requirements: 1.1, 2.1, 3.1_

## 4. Service layer - `rescheduleAppointment` (nucleo da feature)

- [ ] 4.1 Teste: cliente com novo slot livre -> sucesso, audit inserido (`src/services/__tests__/booking.reschedule.test.ts`)
  - Setup: mock de clock, fixture de appointment CONFIRMED, novo barber+slot livre
  - Assertions:
    - retorno contem `AppointmentWithDetails` com novos campos
    - `Appointment.status == CONFIRMED` (nao mudou)
    - `AppointmentReschedule` tem exatamente 1 registro com snapshot correto
  - _Requirements: 1.1, 5.1, 5.5, 7.2_
- [ ] 4.2 Teste: overlap com outro appointment -> `SLOT_OCCUPIED`
  - _Requirements: 4.3, 5.2_
- [ ] 4.3 Teste: overlap apenas com o proprio appointment -> sucesso (exclude funciona)
  - _Requirements: 4.3_
- [ ] 4.4 Teste: cliente dentro da janela 2h (original) -> `RESCHEDULE_BLOCKED_WINDOW`
  - _Requirements: 1.2_
- [ ] 4.5 Teste: cliente para slot < 90min no futuro -> `SLOT_TOO_SOON`
  - _Requirements: 1.4_
- [ ] 4.6 Teste: same-slot -> `RESCHEDULE_UNCHANGED`
  - _Requirements: 1.6_
- [ ] 4.7 Teste: status != CONFIRMED -> `APPOINTMENT_NOT_RESCHEDULABLE`
  - _Requirements: 1.5_
- [ ] 4.8 Teste: violacao de shop hours -> `SHOP_CLOSED` (reuso de `getBookingPolicyError`)
  - _Requirements: 3.3, 4.4_
- [ ] 4.9 Teste: ownership -- client tentando mexer em appointment de outro -> `UNAUTHORIZED`
  - _Requirements: 1.3_
- [ ] 4.10 Teste: barber bypass -- aceita dentro de 2h, ainda valida policy
  - _Requirements: 3.1, 3.3_
- [ ] 4.11 Teste: rollback -- forcar throw no insert de audit e verificar que `Appointment` continua com slot antigo
  - _Requirements: 5.1, 5.2_
- [ ] 4.12 Teste: loyalty NAO e chamado em reschedule (spy em `LoyaltyService.penalizePoints`)
  - _Requirements: 8.1_
- [ ] 4.13 Implementar `rescheduleAppointment(input, context)` em `src/services/booking.ts`
  - Reuso: `getBookingPolicyError`, `lockBarberDateForBooking`, `hasOverlappingAppointment` (novo param), `isSlotTooSoonForClient`, `isClientCancellationBlocked`, `isDateTimeInPast`, `calculateEndTime`
  - Transacao unica para lock + overlap + update + audit
  - Select de retorno identico ao de `cancelAppointmentByClient` (`src/services/booking.ts:1362`)
  - _Requirements: 1.1, 4.1, 4.2, 4.4, 5.1, 5.5, 7.2, 8.1_
- [ ] 4.14 Implementar wrapper `rescheduleAppointmentByGuestToken(id, token, newSlot)` que resolve guest via `getGuestClientByActiveToken` e delega para `rescheduleAppointment` com `actor: "guest"`
  - _Requirements: 2.1, 2.3_

## 5. Concurrency / property tests

- [ ] 5.1 Property test (fast-check): "para qualquer sequencia valida de reschedules, `status` permanece `CONFIRMED` e `reschedules.length` = numero de sucessos"
  - _Requirements: 5.5, 7.2_
- [ ] 5.2 Teste de concorrencia (2 requests paralelos ao mesmo slot alvo) -> apenas 1 passa, outro recebe `SLOT_OCCUPIED`
  - Usar `Promise.all` + DB de teste real; se nao houver infra, deixar como `it.todo` com nota clara.
  - _Requirements: 5.4_

## 6. Route handler - cliente/staff

- [ ] 6.1 Teste em `src/app/api/appointments/[id]/reschedule/__tests__/route.test.ts`
  - 401 sem auth
  - 404 appointment inexistente
  - 422 payload invalido (cobre cada campo do Zod)
  - 200 cliente rescheduling valido + body == AppointmentWithDetails atualizado
  - 400/409 mapeamento correto dos erros de dominio
  - Staff path (`actor: "barber"`) com user que e barbeiro dono -> sucesso dentro da janela
  - Staff path com user que nao e dono -> 401
  - Valida `requireValidOrigin`
  - _Requirements: 1.1, 1.3, 3.1, 5.5_
- [ ] 6.2 Implementar `src/app/api/appointments/[id]/reschedule/route.ts`
  - Espelho estrutural de `src/app/api/appointments/[id]/cancel/route.ts:27`
  - Zod parse -> resolve actor -> chama service -> mapeia erros via tabela do design
  - _Requirements: 1.1, 3.1_
- [ ] 6.3 Disparar notificacoes pos-commit (cliente + barbeiro velho + novo quando aplicavel)
  - Usar padrao `src/services/notification.ts` (ver `notifyAppointmentCancelledByBarber` em `:161` como molde)
  - Falha silenciosa em notificacao nao reverte reschedule
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

## 7. Route handler - guest

- [ ] 7.1 Teste em `src/app/api/appointments/guest/[id]/reschedule/__tests__/route.test.ts`
  - Token ausente -> `MISSING_TOKEN`
  - Token consumido -> `GUEST_TOKEN_CONSUMED`
  - Rate limit acionado -> 429
  - Appointment de outro guest -> `UNAUTHORIZED`
  - Sucesso -> dispara notificacao de barbeiro
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
- [ ] 7.2 Implementar `src/app/api/appointments/guest/[id]/reschedule/route.ts`
  - Espelho estrutural de `src/app/api/appointments/guest/[id]/cancel/route.ts`
  - `checkRateLimit("guestAppointments", ...)`, `X-Guest-Token` header obrigatorio
  - _Requirements: 2.1, 2.4_

## 8. Servico de notificacao

- [ ] 8.1 Teste em `src/services/__tests__/notification.reschedule.test.ts`
  - `notifyAppointmentRescheduled(clientUserId, payload)` cria notification com tipo apropriado
  - Dispara spy de insert com `data` contendo `oldDate/oldTime/newDate/newTime`
  - _Requirements: 6.1_
- [ ] 8.2 Adicionar enum `NotificationType.APPOINTMENT_RESCHEDULED` ao `prisma/schema.prisma` (se ainda nao existir) + migration
  - _Requirements: 6.1_
- [ ] 8.3 Implementar `notifyAppointmentRescheduled` e `notifyBarberOfAppointmentRescheduled` em `src/services/notification.ts`
  - Reusar helper `createNotification` (ver `src/services/notification.ts:41`)
  - _Requirements: 6.1, 6.2, 6.3_

## 9. Hook React Query

- [ ] 9.1 Teste em `src/hooks/__tests__/useRescheduleAppointment.test.ts`
  - Chama `apiMutate` com URL e body corretos
  - Invalida query `["appointments"]` em onSuccess
  - _Requirements: 1.1_
- [ ] 9.2 Adicionar `useRescheduleAppointment` e `useRescheduleGuestAppointment` em `src/hooks/useBooking.ts`
  - Seguir molde de `useCancelAppointment` (`src/hooks/useBooking.ts:182`)
  - _Requirements: 1.1, 2.1_

## 10. UI - botao "Remarcar" em Meus Agendamentos

- [ ] 10.1 Teste em `src/app/[locale]/meus-agendamentos/components/__tests__/UpcomingAppointments.test.tsx`
  - Renderiza botao "Remarcar" quando `canCancel == true`
  - Desabilita/oculta botao quando dentro da janela 2h (igual ao cancel)
  - onClick navega para `/{locale}/agendar?reschedule=<id>`
  - _Requirements: 1.1, 1.2_
- [ ] 10.2 Implementar botao em `UpcomingAppointments.tsx` (icone `CalendarSync` lucide, `variant="outline"`)
  - _Requirements: 1.1_

## 11. UI - fluxo de reschedule no chat

- [ ] 11.1 Teste em `src/components/booking/chat/__tests__/ChatBookingPage.reschedule.test.tsx`
  - Com `mode="reschedule"` e `rescheduleAppointmentId`, NAO exibe passo de servico
  - Usa `useRescheduleAppointment` em submit (nao create)
  - Bloqueia submit se novo slot == slot atual (`RESCHEDULE_UNCHANGED` UI-side)
  - _Requirements: 1.1, 1.6_
- [ ] 11.2 Adicionar props `mode?: "create" | "reschedule"` e `rescheduleAppointmentId?: string` em `ChatBookingPage.tsx`
  - Pre-carregar dados do appointment existente (cache de `useClientAppointments`, fallback fetch)
  - Mensagem inicial condicional
  - _Requirements: 1.1_
- [ ] 11.3 Atualizar `src/app/[locale]/agendar/page.tsx` (ou equivalente) para ler `?reschedule=<id>` e propagar props
  - _Requirements: 1.1_

## 12. Testes de integracao end-to-end (service + route + notificacao)

- [ ] 12.1 Teste E2E em `src/app/api/appointments/__tests__/reschedule.e2e.test.ts` (DB de teste)
  - Cria appointment -> chama PATCH reschedule -> verifica UPDATE + INSERT AppointmentReschedule + ausencia de penalizacao loyalty
  - _Requirements: 5.1, 5.5, 7.2, 8.1_
- [ ] 12.2 Teste de rollback real: injetar erro no notify -> appointment atualizado fica (Req 6.5) + sem audit? NAO, audit deve estar commitado antes do notify (notify fora da TX). Ajustar teste para refletir design.
  - _Requirements: 5.2, 6.5_

## 13. Polish + gate

- [ ] 13.1 Atualizar `docs/Brand_Book_Gold_Mustache.md`? **NAO** (sem impacto visual fora de botao padrao; seguir regra do CLAUDE.md).
- [ ] 13.2 Rodar `pnpm test:gate` (lint + test + coverage) e corrigir qualquer falha.
- [ ] 13.3 Revisar mensagens pt-BR nos erros (sem `any`, sem acentos fora das strings de UI).
- [ ] 13.4 Atualizar FAQ (`faq-section`) para refletir que "Remarcar" agora funciona e explicar a janela de 2h.

## Dependencias cruzadas

- `admin-appointment-management` adiciona o conceito de admin role. Enquanto essa spec nao estiver implementada, o branch admin em `rescheduleAppointment` pode ser gated por feature flag (`feature-flags`) e tratado como "barber bypass" para qualquer barber autenticado.
- `loyalty-automation` NAO bloqueia esta spec; apenas garante que `markAppointmentAsCompleted` continua premiando os pontos corretos apos reschedule (Requirement 8.2).
