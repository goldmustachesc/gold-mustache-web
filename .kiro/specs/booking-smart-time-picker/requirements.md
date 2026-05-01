# Requirements — Booking Smart Time Picker

## Introdução

A etapa atual de horário no chat de agendamento ainda expõe conceitos técnicos
demais para o cliente: janelas livres, início exato, campo manual, intervalo de
5 minutos e lista expandida de inícios válidos. Embora isso ajude a explicar a
regra de disponibilidade, a experiência continua exigindo que o cliente pense
como o sistema.

Esta spec define uma reformulação da etapa de horário para um seletor
inteligente. A prioridade do produto é: primeiro tornar a escolha o mais fácil
possível para o cliente, depois garantir que só apareçam horários realmente
agendáveis e, por fim, ordenar/incentivar horários que reduzam lacunas na agenda
do barbeiro.

## Contexto da Feature

- **Domínio**: agendamentos, disponibilidade e seleção de horário.
- **Público principal**: clientes no chat de agendamento.
- **Públicos secundários**: clientes no booking público e barbeiros na agenda
  privada, porque a regra de horário deve permanecer centralizada.
- **Impacto esperado**: substituir a escolha manual por uma lista curta de
  horários prontos, recomendados por disponibilidade real e qualidade de encaixe
  operacional.

## Requisitos

### Requirement 1: Escolha de horário simples para o cliente

**Objetivo:** Como cliente, quero escolher um horário pronto com poucos toques,
para concluir o agendamento sem entender janelas livres ou regras técnicas.

#### Acceptance Criteria

1. When o cliente chegar à etapa de horário com barbeiro, serviço e data
   definidos, the sistema shall mostrar horários prontos para seleção em vez de
   priorizar um campo manual de início exato.
2. When houver horários recomendados, the sistema shall exibir esses horários
   em uma seção principal chamada "Melhores horários" ou copy equivalente.
3. When o cliente selecionar um horário, the sistema shall mostrar o intervalo
   completo do atendimento no formato `HH:mm - HH:mm` antes da confirmação.
4. The sistema shall manter o botão de confirmação desabilitado até existir um
   horário válido selecionado.
5. The sistema shall evitar termos técnicos como "janelas livres", "inícios
   válidos" e "intervalos de 5 minutos" na experiência principal do cliente.

### Requirement 2: Mostrar apenas horários realmente agendáveis

**Objetivo:** Como cliente, quero ver apenas opções que posso confirmar, para
não cair em erro depois de escolher um horário.

#### Acceptance Criteria

1. When o sistema renderizar opções de horário, the sistema shall incluir apenas
   horários cujo atendimento inteiro caiba dentro das disponibilidades
   calculadas.
2. When houver bloqueios, ausências, almoço, agendamentos existentes, antecedência
   mínima ou barbeiro indisponível, the sistema shall não exibir horários que
   violem essas regras.
3. When um horário deixar de estar disponível após recarregamento ou submissão,
   the sistema shall impedir a confirmação e solicitar uma nova escolha.
4. The sistema shall preservar a validação server-side existente como fonte de
   verdade para criação e remarcação de agendamentos.
5. The sistema shall aplicar a mesma regra central de disponibilidade no chat,
   booking público e agenda privada quando essas superfícies usarem o novo
   seletor.

### Requirement 3: Recomendar horários que reduzem lacunas do barbeiro

**Objetivo:** Como operação da barbearia, quero que o sistema favoreça encaixes
bons na agenda, para reduzir períodos improdutivos entre atendimentos.

#### Acceptance Criteria

1. When existirem múltiplos horários disponíveis, the sistema shall ordenar os
   horários por uma pontuação de encaixe antes de exibi-los ao cliente.
2. When um horário começar no início de uma janela livre, the sistema shall
   tratá-lo como candidato forte.
3. When um horário terminar exatamente no fim de uma janela livre, the sistema
   shall tratá-lo como candidato forte.
4. When um horário quebrar uma janela grande no meio, the sistema shall
   classificá-lo abaixo dos horários que compactam a agenda.
5. When um horário deixar uma lacuna menor que a menor duração de serviço
   agendável, the sistema shall classificá-lo como ruim ou escondê-lo da lista
   principal.
6. The sistema shall nunca mostrar como "melhor horário" uma opção que prejudica
   claramente a agenda quando existe alternativa equivalente melhor para o
   cliente.

### Requirement 4: Expandir opções sem sobrecarregar a primeira tela

**Objetivo:** Como cliente, quero ter mais opções se precisar, para preservar
flexibilidade sem receber uma lista enorme logo de início.

#### Acceptance Criteria

1. When houver muitos horários disponíveis, the sistema shall limitar a primeira
   tela aos horários recomendados.
2. When existirem horários válidos fora da lista principal, the sistema shall
   oferecer uma ação secundária para ver mais horários.
3. When o cliente expandir mais horários, the sistema shall continuar agrupando
   as opções por período do dia ou seção equivalente.
4. The sistema shall diferenciar visualmente horários recomendados dos demais
   horários válidos sem sugerir que os demais sejam inválidos.
5. The sistema shall manter a lista legível em mobile, desktop, light mode e
   dark mode.

### Requirement 5: Comunicar indisponibilidade com ação clara

**Objetivo:** Como cliente, quero entender rapidamente quando não há horário
para aquela combinação, para ajustar data, serviço ou barbeiro.

#### Acceptance Criteria

1. When não houver horários disponíveis para a combinação escolhida, the sistema
   shall mostrar uma mensagem curta de indisponibilidade.
2. When não houver horários no dia, the sistema shall oferecer ação para escolher
   outra data.
3. When a indisponibilidade estiver ligada ao barbeiro ou serviço escolhido, the
   sistema shall orientar troca de barbeiro ou serviço sem expor detalhe interno
   de regra.
4. The sistema shall evitar mostrar listas vazias, contadores técnicos ou
   mensagens que pareçam falha do sistema quando o cenário for apenas agenda
   indisponível.

### Requirement 6: Regras centralizadas e testáveis

**Objetivo:** Como mantenedor, quero uma regra única para gerar, pontuar e
apresentar horários, para evitar divergência entre superfícies de agendamento.

#### Acceptance Criteria

1. The sistema shall centralizar a geração e ranking de horários em lógica pura
   reutilizável, fora dos componentes React.
2. The sistema shall manter componentes responsáveis por apresentação e eventos,
   não por regras de negócio de encaixe.
3. When a política de pontuação mudar, the sistema shall permitir ajustar testes
   do motor de horários sem reescrever cada superfície.
4. The sistema shall reaproveitar helpers existentes de disponibilidade e
   normalização de horários sempre que possível.
5. The sistema shall manter tipagem estrita e não introduzir `any`.

## Escopo e Limites

- Faz parte da entrega: novo contrato de seleção inteligente de horário, ranking
  anti-lacunas, agrupamento visual por recomendados/período, estado vazio
  orientado à ação e integração inicial no chat de agendamento.
- Faz parte da entrega técnica: preparar o seletor para ser reutilizado no
  booking público e agenda privada, mesmo que a primeira ativação seja no chat.
- Não faz parte da entrega: alterar duração de serviços, mudar jornada de
  barbeiro, criar regras de preço dinâmico, alterar checkout/pagamento ou
  substituir a validação server-side.
- Não faz parte da entrega: prometer otimização matemática perfeita da agenda.
  A primeira versão deve usar heurística simples, determinística e fácil de
  auditar.
- A mudança deve respeitar a política já validada de horários arredondados em
  múltiplos de 5 minutos e a autoridade dos horários específicos do barbeiro.

## Notas de Escrita

- O cliente deve ver linguagem de escolha, não linguagem de cálculo.
- O sistema pode calcular em intervalos de 5 minutos internamente, mas a primeira
  tela deve favorecer horários limpos e encaixes bons.
- Exemplos como `09:53 -> 09:55` são cenários de normalização, não regra fixa de
  produto.
- A implementação deve seguir TDD e SDD: decompor motor, UI e validação em
  unidades pequenas, com checkpoints claros antes de ativar em mais superfícies.
