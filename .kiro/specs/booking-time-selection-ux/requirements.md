# Requirements — Booking Time Selection UX

## Introdução

A experiência atual do seletor de início exato mostra janelas livres e um input
`type="time"`, mas a mensagem de erro é genérica: "Escolha um horário dentro
das janelas disponíveis." Em casos como janela `17:55 - 18:45`, serviço de
`45 min` e início escolhido `18:35`, o horário inicial está dentro da janela,
porém o atendimento terminaria `19:20`, ultrapassando a janela. Para o usuário,
a mensagem atual parece incorreta e não explica o ajuste necessário.

Esta spec define uma melhoria de UX para tornar a decisão clara em cenários
válidos e inválidos: mostrar duração do serviço, término previsto, encaixe na
janela, último início possível e ações rápidas para corrigir o horário.

## Contexto da Feature

- **Domínio**: agendamentos e seleção de horário.
- **Público principal**: clientes no booking público, clientes no chat de
  agendamento e barbeiros usando a agenda privada.
- **Impacto esperado**: reduzir tentativas inválidas, explicar por que um
  horário não cabe e manter a mesma regra visual nas superfícies existentes.

## Requisitos

### Requirement 1: Resumo claro do atendimento selecionado

**Objetivo:** Como cliente ou barbeiro, quero ver duração e término previsto do
atendimento antes de confirmar, para entender o impacto do horário escolhido.

#### Acceptance Criteria

1. When uma disponibilidade com serviço selecionado for exibida, the sistema
   shall mostrar a duração do serviço em minutos perto do seletor de horário.
2. When o usuário escolher um início válido, the sistema shall mostrar o
   intervalo completo do atendimento no formato `HH:mm - HH:mm`.
3. When o usuário alterar o início exato, the sistema shall recalcular o término
   previsto imediatamente sem aguardar confirmação.
4. The sistema shall manter a informação legível em light mode e dark mode.

### Requirement 2: Seleção orientada por horários válidos

**Objetivo:** Como usuário que está escolhendo um horário, quero ver opções de
início válidas, para não precisar adivinhar quais horários cabem na janela.

#### Acceptance Criteria

1. When existirem janelas disponíveis, the sistema shall gerar inícios válidos
   em intervalos de `BOOKING_START_TIME_STEP_MINUTES` considerando a duração do
   serviço.
2. When a janela permitir poucos inícios válidos, the sistema shall exibir esses
   inícios como ações rápidas selecionáveis.
3. When existirem muitos inícios válidos, the sistema shall limitar a lista
   visível de ações rápidas sem remover o input manual.
4. If o usuário selecionar uma ação rápida, the sistema shall preencher o input
   exato com o horário escolhido e limpar o erro de seleção.
5. The sistema shall continuar aceitando input manual em múltiplos de 5 minutos,
   desde que o atendimento inteiro caiba em uma das janelas.

### Requirement 3: Erro específico quando o serviço não cabe

**Objetivo:** Como usuário que escolheu um início inválido, quero entender que a
duração do serviço ultrapassa a janela, para corrigir o horário sem tentativa e
erro.

#### Acceptance Criteria

1. When o início escolhido estiver dentro de uma janela mas `início + duração`
   ultrapassar o fim dessa janela, the sistema shall informar que o serviço não
   cabe nessa janela.
2. When esse erro ocorrer, the sistema shall mostrar duração do serviço, início
   escolhido, término previsto e fim da janela em texto objetivo.
3. When houver um último início possível na mesma janela, the sistema shall
   oferecer uma ação rápida para usar esse horário.
4. If não houver início possível na mesma janela, the sistema shall orientar o
   usuário a escolher outra janela, data ou serviço.
5. The sistema shall evitar a mensagem genérica "horário fora da janela" quando
   o problema real for a duração do serviço.

### Requirement 4: Erro específico para horário fora das janelas

**Objetivo:** Como usuário que digitou um horário fora de todas as janelas,
quero saber que o início não pertence às janelas livres, para escolher uma
janela correta.

#### Acceptance Criteria

1. When o início escolhido não estiver dentro de nenhuma janela, the sistema
   shall mostrar que o início precisa estar dentro de uma das janelas livres.
2. When houver uma próxima opção válida, the sistema shall sugerir o próximo
   início válido.
3. If não houver próxima opção válida no dia, the sistema shall orientar o
   usuário a escolher outra data ou outro serviço.
4. The sistema shall manter o botão de confirmação desabilitado enquanto houver
   erro de seleção.

### Requirement 5: Consistência entre superfícies de agendamento

**Objetivo:** Como mantenedor, quero uma regra única de feedback de horário,
para que booking público, chat e agenda do barbeiro expliquem erros da mesma
forma.

#### Acceptance Criteria

1. The sistema shall aplicar a mesma lógica de cálculo de encaixe nos
   componentes `TimeSlotGrid`, `ChatTimeSlotSelector` e `TimeSlotsSection`.
2. The sistema shall evitar duplicação de mensagens e cálculos de término entre
   componentes.
3. When a regra de intervalo de início mudar, the sistema shall refletir a
   mudança em todas as superfícies por meio da constante compartilhada.
4. The sistema shall preservar a validação server-side existente de
   disponibilidade; esta feature melhora orientação de UI, não substitui as
   garantias do backend.

## Escopo e Limites

- Faz parte da entrega: feedback visual do seletor de horário, cálculo de
  término previsto, mensagens específicas de erro, ações rápidas para horários
  válidos e testes focados nas três superfícies atuais.
- Não faz parte da entrega: alterar regra de disponibilidade no backend, mudar
  duração de serviços, criar nova tela de calendário ou modificar fluxo de
  pagamento/checkout.
- A mudança deve respeitar a normalização existente de horários em múltiplos de
  5 minutos e a regra central em `src/lib/booking/availability-windows.ts`.

## Notas de Escrita

- Mensagens ao usuário devem ser curtas, explicativas e orientadas à ação.
- Exemplos numéricos como `18:35 -> 19:20` devem ser tratados como cenários de
  teste, não como regra fixa de produto.
- A implementação deve seguir TDD e preservar tipagem estrita sem `any`.
