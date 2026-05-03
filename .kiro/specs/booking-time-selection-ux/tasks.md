# Tasks — Booking Time Selection UX

> Ordem TDD obrigatória: RED → GREEN → REFACTOR. Manter funções pequenas,
> tipagem explícita e nenhuma introdução de `any`.

## 0. Preparação

- [x] 0.1 Reler os arquivos atuais de seleção de horário:
  `src/components/booking/TimeSlotGrid.tsx`,
  `src/components/booking/chat/ChatTimeSlotSelector.tsx`,
  `src/components/barber-scheduling/TimeSlotsSection.tsx` e
  `src/hooks/useBarberSchedulingForm.ts`.
- [x] 0.2 Confirmar baseline focado dos testes existentes:
  `pnpm test src/components/booking src/components/barber-scheduling src/hooks/__tests__/useBarberSchedulingForm.test.tsx`.
- [x] 0.3 Confirmar que a regra compartilhada atual continua em
  `src/lib/booking/availability-windows.ts` e `src/utils/time-slots.ts`.

## 1. Helper compartilhado de feedback

- [x] 1.1 **RED** — Criar
  `src/lib/booking/__tests__/time-selection-feedback.test.ts` cobrindo:
  - início válido com duração que termina exatamente no fim da janela;
  - início dentro da janela que não comporta o serviço;
  - início fora de todas as janelas;
  - sugestão do último início possível;
  - lista de inícios válidos em múltiplos de `BOOKING_START_TIME_STEP_MINUTES`.
  - _Requirements: 1, 2, 3, 4, 5_
- [x] 1.2 **GREEN** — Implementar
  `src/lib/booking/time-selection-feedback.ts` com contrato tipado para status,
  término previsto, janela correspondente, sugestões e inícios válidos.
  - _Requirements: 1, 2, 3, 4, 5_
- [x] 1.3 **REFACTOR** — Reutilizar helpers existentes de
  `src/utils/time-slots.ts`; não duplicar parsing/conversão de horário.
  - _Requirements: 5_
- [x] 1.4 Rodar
  `pnpm test src/lib/booking/__tests__/time-selection-feedback.test.ts`.

## 2. Booking público: `TimeSlotGrid`

- [x] 2.1 **RED** — Atualizar
  `src/components/booking/__tests__/TimeSlotGrid.test.tsx` para exigir:
  - duração do serviço visível;
  - intervalo do atendimento no estado válido;
  - erro contextual quando o serviço não cabe;
  - ação rápida para usar o último início possível.
  - _Requirements: 1, 2, 3, 4_
- [x] 2.2 **GREEN** — Atualizar
  `src/components/booking/TimeSlotGrid.tsx` para consumir o helper de feedback,
  renderizar resumo, sugestões e mensagem específica.
  - _Requirements: 1, 2, 3, 4_
- [x] 2.3 **REFACTOR** — Ajustar copy e classes Tailwind para manter densidade,
  legibilidade e light/dark sem criar novo design system.
  - _Requirements: 1, 3_
- [x] 2.4 Rodar `pnpm test src/components/booking/__tests__/TimeSlotGrid.test.tsx`.

## 3. Chat booking: `ChatTimeSlotSelector`

- [x] 3.1 **RED** — Atualizar
  `src/components/booking/chat/__tests__/ChatTimeSlotSelector.test.tsx` para
  cobrir resumo válido, erro por duração e ação rápida.
  - _Requirements: 1, 2, 3, 4_
- [x] 3.2 **GREEN** — Atualizar
  `src/components/booking/chat/ChatTimeSlotSelector.tsx` usando o mesmo helper
  e preservando o comportamento atual de no-slots e botão sticky.
  - _Requirements: 1, 2, 3, 4, 5_
- [ ] 3.3 **REFACTOR** — Se a marcação visual duplicar muito a do booking
  público, extrair componente pequeno compartilhado sem acoplar estilos
  específicos do chat.
  - _Requirements: 5_
- [x] 3.4 Rodar
  `pnpm test src/components/booking/chat/__tests__/ChatTimeSlotSelector.test.tsx`.

## 4. Agenda do barbeiro

- [x] 4.1 **RED** — Atualizar
  `src/hooks/__tests__/useBarberSchedulingForm.test.tsx` para exigir mensagem
  específica quando o serviço não cabe na janela.
  - _Requirements: 3, 4, 5_
- [x] 4.2 **RED** — Atualizar
  `src/components/barber-scheduling/__tests__/TimeSlotsSection.test.tsx` para
  cobrir duração, intervalo previsto e ação rápida.
  - _Requirements: 1, 2, 3_
- [x] 4.3 **GREEN** — Atualizar `src/hooks/useBarberSchedulingForm.ts` para
  consumir o helper compartilhado na validação do horário.
  - _Requirements: 3, 4, 5_
- [x] 4.4 **GREEN** — Atualizar
  `src/components/barber-scheduling/TimeSlotsSection.tsx` para exibir o mesmo
  resumo e aceitar ação rápida de seleção.
  - _Requirements: 1, 2, 3, 5_
- [x] 4.5 Rodar
  `pnpm test src/hooks/__tests__/useBarberSchedulingForm.test.tsx src/components/barber-scheduling/__tests__/TimeSlotsSection.test.tsx`.

## 5. Consistência e validação final

- [x] 5.1 Buscar mensagens antigas:
  `rg "Escolha um horário dentro das janelas disponíveis" src/components src/hooks`.
  Restos só são aceitáveis se forem fallback genérico não alcançado nos casos
  específicos desta spec.
  - _Requirements: 3, 4, 5_
- [x] 5.2 Rodar testes focados:
  `pnpm test src/lib/booking src/components/booking src/components/barber-scheduling src/hooks/__tests__/useBarberSchedulingForm.test.tsx`.
  - _Requirements: 1, 2, 3, 4, 5_
- [x] 5.3 Rodar `pnpm lint` e `pnpm type-check`.
  - _Requirements: 5_
- [ ] 5.4 Fazer verificação visual manual em light/dark:
  - estado sem serviço selecionado;
  - estado carregando;
  - sem janelas;
  - horário válido;
  - horário dentro da janela que não comporta o serviço;
  - horário fora de todas as janelas.
  - _Requirements: 1, 2, 3, 4_

## Dependencies

- Task 1 antes de 2, 3 e 4.
- Tasks 2, 3 e 4 podem ser feitas em paralelo depois do helper.
- Task 5 só depois das três superfícies atualizadas.
