# Tasks — Booking Smart Time Picker

> Ordem TDD obrigatória: RED → GREEN → REFACTOR. Aplicar SDD por decomposição:
> motor puro, UI compartilhada, integração no chat e migração das demais
> superfícies devem ter checkpoints próprios. Manter funções pequenas, tipagem
> explícita e nenhuma introdução de `any`.

## 0. Preparação

- [x] 0.1 Confirmar o comportamento atual do chat em
  `src/components/booking/chat/ChatTimeSlotSelector.tsx` e seus testes.
  - _Requirements: 1, 2_
- [x] 0.2 Confirmar contratos existentes em `BookingAvailability`,
  `AvailabilityWindow`, `src/lib/booking/time-selection-feedback.ts` e
  `src/utils/time-slots.ts`.
  - _Requirements: 2, 6_
- [x] 0.3 Definir o valor inicial de `minBookableGapMinutes`; usar menor duração
  de serviço se disponível no fluxo, senão fallback para duração do serviço
  selecionado.
  - _Requirements: 3_

## 1. Motor central de horários inteligentes

- [x] 1.1 **RED** — Criar
  `src/lib/booking/__tests__/smart-time-picker.test.ts` cobrindo geração de
  opções válidas, recomendação por borda da janela, penalidade por lacuna pequena
  e empty state.
  - _Requirements: 2, 3, 5, 6_
- [x] 1.2 **GREEN** — Implementar `src/lib/booking/smart-time-picker.ts` com
  `buildSmartTimePickerModel`, `SmartTimeOption`, `SmartTimeGroup` e scoring v1.
  - _Requirements: 2, 3, 4, 5, 6_
- [x] 1.3 **REFACTOR** — Reusar parsing, formatação e step de
  `src/utils/time-slots.ts`; evitar duplicação com `time-selection-feedback.ts`.
  - _Requirements: 6_
- [x] 1.4 Rodar
  `pnpm test src/lib/booking/__tests__/smart-time-picker.test.ts`.
  - _Requirements: 2, 3, 6_

## 2. Componente compartilhado `SmartTimePicker`

- [x] 2.1 **RED** — Criar
  `src/components/booking/__tests__/SmartTimePicker.test.tsx` cobrindo
  recomendados, seleção, confirmação, expansão de mais horários e empty state.
  - _Requirements: 1, 4, 5_
- [x] 2.2 **GREEN** — Implementar `src/components/booking/SmartTimePicker.tsx`
  como componente controlado por `SmartTimePickerViewModel`.
  - _Requirements: 1, 4, 5_
- [x] 2.3 **REFACTOR** — Ajustar layout mobile/desktop, light/dark e dimensões
  estáveis dos botões sem criar novo design system.
  - _Requirements: 1, 4_
- [x] 2.4 Rodar
  `pnpm test src/components/booking/__tests__/SmartTimePicker.test.tsx`.
  - _Requirements: 1, 4, 5_

## 3. Integração principal no chat de agendamento

- [x] 3.1 **RED** — Atualizar
  `src/components/booking/chat/__tests__/ChatTimeSlotSelector.test.tsx` para
  exigir ausência de input manual no fluxo principal, seleção por horário pronto
  e confirmação do intervalo.
  - _Requirements: 1, 2, 4, 5_
- [x] 3.2 **GREEN** — Atualizar
  `src/components/booking/chat/ChatTimeSlotSelector.tsx` para consumir
  `buildSmartTimePickerModel` e renderizar `SmartTimePicker`.
  - _Requirements: 1, 2, 3, 4, 5, 6_
- [x] 3.3 **REFACTOR** — Remover copy técnica do fluxo principal do chat:
  "Janelas livres", "Escolha o início exato", "Inícios válidos" e orientação de
  intervalo de 5 minutos.
  - _Requirements: 1_
- [x] 3.4 Rodar
  `pnpm test src/components/booking/chat/__tests__/ChatTimeSlotSelector.test.tsx`.
  - _Requirements: 1, 2, 4, 5_

## 4. Proteção contra regressões de disponibilidade

- [x] 4.1 Adicionar testes de integração ou ampliar testes existentes para
  garantir que horários vindos do picker continuam submetidos pelo fluxo atual
  de criação/remarcação.
  - _Requirements: 2_
- [x] 4.2 Testar cenário em que a disponibilidade muda e a opção selecionada
  some do modelo, limpando a seleção.
  - _Requirements: 2, 5_
- [x] 4.3 Garantir que conflito server-side ainda exibe mensagem acionável e
  recarrega opções.
  - _Requirements: 2, 5_

## 5. Migração controlada para outras superfícies

- [x] 5.1 Avaliar `src/components/booking/TimeSlotGrid.tsx` e decidir se a
  migração para `SmartTimePicker` entra na mesma entrega ou em follow-up.
  - _Requirements: 5, 6_
- [x] 5.2 Avaliar `src/components/barber-scheduling/TimeSlotsSection.tsx`; para
  barbeiros, permitir modo operacional mais detalhado apenas se necessário.
  - _Requirements: 5, 6_
- [ ] 5.3 Se migrar alguma superfície adicional, criar/atualizar testes focados
  antes da alteração.
  - _Requirements: 2, 6_

## 6. Validação final

- [x] 6.1 Rodar testes focados:
  `pnpm test src/lib/booking src/components/booking src/components/barber-scheduling src/hooks/__tests__/useBarberSchedulingForm.test.tsx`.
  - _Requirements: 1, 2, 3, 4, 5, 6_
- [x] 6.2 Rodar `pnpm lint` e `pnpm type-check`.
  - _Requirements: 6_
- [x] 6.3 Validar visualmente o chat em mobile/desktop e light/dark:
  recomendados, mais horários, seleção confirmada, sem horários e erro/conflito.
  - _Requirements: 1, 4, 5_

## Dependencies

- Task 1 antes de 2 e 3.
- Task 2 antes da integração visual no chat.
- Tasks 4 e 5 podem avançar depois que o contrato central estiver estável.
- Task 6 só depois da integração principal concluída.
