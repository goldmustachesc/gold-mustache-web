# Documento de Requisitos

## Introdução

Esta spec redesenha a página de agendamento (`/{locale}/agendar`) para tirar proveito da viewport desktop (≥`lg`, 1024px). A direção escolhida em `brainstorm.md` é **D — Hybrid live preview**: layout split com chat à esquerda, painel de "Live Preview" à direita e resumo sticky horizontal no topo. Mobile permanece com o layout single-column atual.

A entrega visa reduzir a percepção de "site mobile esticado", manter o cliente sempre orientado sobre o estado do agendamento e criar um momento visual marcante na confirmação. Todos os componentes de seleção (`ChatBarberSelector`, `ChatServiceSelector`, `ChatDatePicker`, `ChatTimeSlotSelector`/`SmartTimePicker`, `ChatGuestInfoForm`, `ChatProfileUpdateForm`) continuam sendo reaproveitados.

## Contexto da Feature

- **Domínio**: agendamentos (booking) — fluxo principal de conversão.
- **Público principal**: clientes (logados e guest) acessando o agendamento em desktop. Secundariamente, a equipe interna que monitora a experiência de marca.
- **Impacto esperado**: melhorar o aproveitamento de espaço em desktop, manter o resumo do agendamento sempre visível (incluindo na revisão), e mostrar uma prévia visual rica que evolui com as escolhas, sem regressão em mobile/tablet.

## Requisitos

### Requirement 1: Layout responsivo com split em desktop

**Objetivo:** Como cliente em desktop, quero ver o chat e uma prévia do meu agendamento lado a lado, para entender o estado atual sem rolar a página.

#### Acceptance Criteria

1. When a viewport tem largura ≥1024px (`lg`), the booking page shall renderizar duas colunas: chat à esquerda (~55% da largura útil) e Live Preview à direita (~45%).
2. When a viewport tem largura <1024px, the booking page shall renderizar layout single-column (estado atual), com o Live Preview ocultado até a etapa `review`.
3. When o usuário redimensiona a janela cruzando o breakpoint, the layout shall transitar sem perder estado (etapa, mensagens, escolhas).
4. The split layout shall preservar todos os comportamentos atuais do chat (typing indicator, animações de entrada de mensagens, scroll automático).

### Requirement 2: Resumo sticky horizontal sempre visível

**Objetivo:** Como cliente, quero ver minhas escolhas atuais a qualquer momento do fluxo, para evitar erros e ganhar confiança antes de confirmar.

#### Acceptance Criteria

1. The booking page shall exibir o `BookingProgressSummary` em formato horizontal no topo, sticky, em todas as etapas exceto `greeting`, `confirming` e `confirmation`.
2. When o usuário está na etapa `review`, the summary shall continuar visível no topo (remover a regressão atual onde ele é escondido em `review`).
3. When uma escolha já foi feita (barbeiro, serviço, data, horário), the summary shall mostrar o valor e um botão "editar" que dispara `navigateToStep` para a etapa correspondente.
4. When uma escolha ainda não foi feita, the summary shall mostrar o placeholder em estado muted, sem botão "editar".
5. The summary shall manter compatibilidade light/dark mode usando os tokens definidos em `src/app/globals.css`.

### Requirement 3: Live Preview Card que evolui com as escolhas

**Objetivo:** Como cliente em desktop, quero ver uma prévia visual rica do meu agendamento ganhando forma, para sentir confiança e antecipação.

#### Acceptance Criteria

1. When a viewport é ≥1024px e a etapa não é `confirmation`, the Live Preview shall ser visível na coluna direita.
2. When um barbeiro foi selecionado, the Live Preview shall exibir foto/avatar e nome do barbeiro em destaque.
3. When um serviço foi selecionado, the Live Preview shall exibir nome, duração e preço do serviço.
4. When uma data foi selecionada, the Live Preview shall exibir a data formatada por extenso (ex.: "Quinta-feira, 1 de maio de 2026").
5. When um horário foi selecionado, the Live Preview shall exibir a faixa de horário com início e término (`calculateEndTime` usando duração do serviço).
6. While nenhuma escolha foi feita ainda, the Live Preview shall mostrar um estado vazio com mensagem amigável ("Suas escolhas aparecerão aqui") e ilustração/ícone neutro.
7. When o usuário está na etapa `review`, the Live Preview shall promover-se a card de confirmação contendo os botões "Confirmar agendamento" e "Voltar e editar".
8. While `createAppointment.isPending` ou `createGuestAppointment.isPending`, the Live Preview shall exibir estado de loading no botão de confirmação e desabilitar a edição.

### Requirement 4: Botões de ação no Live Preview durante review

**Objetivo:** Como cliente em desktop, quero confirmar o agendamento a partir do card de prévia, para que a ação principal esteja no foco visual.

#### Acceptance Criteria

1. When a etapa é `review` em desktop, the booking page shall renderizar os botões "Confirmar agendamento" e "Voltar e editar" dentro do Live Preview, e não dentro do chat.
2. When a etapa é `review` em mobile (<1024px), the booking page shall manter os botões dentro do `renderSelector` (comportamento atual).
3. When o usuário clica em "Confirmar agendamento" pelo Live Preview, the system shall executar `handleConfirmBooking` (mesma função do mobile).
4. When o usuário clica em "Voltar e editar" pelo Live Preview, the system shall executar `handleBackFromReview`.
5. The Live Preview em `review` shall exibir os dados do cliente (nome + telefone para guest, "Cadastro pronto" para logado) com botão "Editar dados" que dispara `handleEditCustomerData`.

### Requirement 5: Selectors com largura adaptativa

**Objetivo:** Como cliente em desktop, quero que cards de barbeiro, serviço e horário usem o espaço disponível, para escolher mais rápido sem rolar.

#### Acceptance Criteria

1. When o chat está em layout split em desktop, the selector ativo shall ocupar 100% da largura da coluna chat (não mais `max-w-[95%]` da viewport).
2. When `ChatBarberSelector` é renderizado em desktop split, the selector shall manter sua grid responsiva interna (não precisa mudar — apenas ganha mais espaço).
3. When `SmartTimePicker` é renderizado em desktop split, the selector shall manter o comportamento atual de janelas e sugestões.
4. The selectors shall continuar funcionando com 100% de paridade visual em mobile.

### Requirement 6: Estados vazios e loading consistentes

**Objetivo:** Como cliente, quero que a interface comunique claramente quando algo está carregando ou ainda não foi escolhido, para não me perder.

#### Acceptance Criteria

1. While `profileLoading` é `true` para usuário logado, the Live Preview shall não mostrar dados do cliente (skeleton ou placeholder).
2. While `barbersLoading`, `servicesLoading` ou `slotsLoading` é `true` na etapa correspondente, the Live Preview shall manter o último estado válido visível e exibir indicador sutil de carregamento.
3. When o Live Preview está em estado vazio inicial, the card shall ter altura mínima estável (sem layout shift) e mensagem amigável.

### Requirement 7: Acessibilidade e responsividade

**Objetivo:** Como usuário com necessidades de acessibilidade ou dispositivo intermediário (tablet), quero o layout funcionando corretamente, para conseguir agendar sem barreiras.

#### Acceptance Criteria

1. The split layout shall ter `aria-label` apropriado em cada coluna (ex.: "Conversa de agendamento", "Resumo do agendamento").
2. The summary sticky shall ser navegável por teclado, com botões "editar" focáveis e atalho de "skip to chat" disponível.
3. When viewport está entre 768px e 1023px (tablet), the layout shall renderizar single-column (mesmo do mobile) para evitar split apertado.
4. The Live Preview shall respeitar `prefers-reduced-motion` para animações de transição entre estados.
5. The booking page shall manter funcionamento em zoom até 200% sem quebrar o layout split (degrada para single-column se necessário).

## Escopo e Limites

### Dentro do escopo

- Refator de layout em `ChatBookingPage.tsx` para introduzir o split desktop.
- Novo componente `BookingLivePreview.tsx` em `src/components/booking/`.
- Ajuste de `BookingProgressSummary` para suportar variante sticky horizontal full-width.
- Reaproveitamento integral de selectors atuais.
- Testes (Vitest + Testing Library) cobrindo: breakpoint, sticky summary, live preview reagindo a escolhas, botões no review desktop, fallback mobile.
- Documentação inline mínima (apenas onde a intenção não é óbvia pelo nome).

### Fora do escopo

- Não substitui a metáfora de chat (alternativa C foi descartada).
- Não altera a lógica de negócio do agendamento (`useCreateAppointment`, validações, smart time picker).
- Não altera o fluxo mobile, exceto pelo summary voltar a aparecer em `review` (correção que beneficia ambos os layouts).
- Não introduz testes E2E nesta entrega; a cobertura permanece em testes unitários e de fluxo (Vitest).
- Não reformula `BookingConfirmation` (tela pós-confirmação) — fora desta spec.
- Não inclui mudanças de copy/i18n além das strings novas estritamente necessárias.

### Restrições brownfield

- Manter compatibilidade com `useProfileMe`, `useBooking`, `useAuth` sem mudanças nos contratos.
- Preservar comportamento de `processedStepsRef` e `clearProcessedStepsFrom` (corrigidos em commit recente).
- Não introduzir `any`; respeitar `core.md` e `frontend-components.mdc`.
- Light/Dark mode obrigatório usando tokens existentes.
- Brand Book como referência única para cores, espaçamentos e tipografia novas.

## Notas de Escrita

- Os critérios usam EARS (When/While/If/The ... shall ...) em inglês; o restante em português.
- "Live Preview" é o nome do componente novo e da feature visualmente — manter consistente em código e UI.
- Breakpoints seguem Tailwind padrão (`md` 768px, `lg` 1024px, `xl` 1280px).
