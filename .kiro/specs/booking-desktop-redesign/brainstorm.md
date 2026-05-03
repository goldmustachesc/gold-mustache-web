# Brainstorm — booking-desktop-redesign

> Fase 0 obrigatória para specs tier Full. Documenta alternativas antes de comprometer com uma direção.

## Problema

A página `/{locale}/agendar` (`ChatBookingPage.tsx`) usa um layout single-column otimizado para mobile. Em desktop (≥1024px) o chat ocupa apenas ~640px central e deixa ~50% da viewport vazia. Consequências observadas:

- **Desperdício de espaço**: laterais brancas em desktop quebram a sensação de produto premium prometida no Brand Book.
- **Contexto perdido no review**: o `BookingProgressSummary` é escondido na etapa de revisão (commit recente `d893b11`), forçando o cliente a rolar para conferir escolhas.
- **Selectors apertados**: `ChatBarberSelector`, `ChatServiceSelector`, `SmartTimePicker` ficam limitados a `max-w-[95%]` da coluna e renderizam em grids 1-2 colunas mesmo havendo espaço.
- **Fluxo linear sem visão geral**: cliente só vê "onde está" pela memória do chat; cada step exige scroll.

Por que agora: o fluxo de agendamento é o caminho de conversão mais crítico do produto. Ganhos de clareza em desktop reduzem fricção em clientes que agendam pelo trabalho/casa.

Impacto se não for feito: menor conversão em desktop, percepção de "site mobile esticado", pressão por mais ajustes pontuais (band-aids como o que escondeu o resumo no review).

## Alternativas

### Alternativa A — Split 2-col (chat history + action panel)

Esquerda 35% com histórico do chat compacto (narração + chips das escolhas). Direita 65% com painel ativo grande mostrando o selector da etapa corrente em cards ricos. Resumo sticky no topo.

**Prós:**
- Aproveita largura ao máximo.
- Action panel pode ter cards ricos (foto barbeiro, ícones, descrições longas).
- Separa narrativa (esquerda) de ação (direita).

**Contras:**
- Refator considerável no `renderSelector` — selectors hoje vivem dentro do fluxo do chat.
- Quebra o paralelismo com a versão mobile (manutenção dobrada para alguns componentes).
- Risco de chat virar "log inútil" se a ação acontece toda à direita.

### Alternativa B — Sidebar resumo + chat central

Sidebar fixa esquerda 280px com `BookingProgressSummary` vertical (sempre visível, edit inline). Chat centralizado com largura aumentada (~720px). Direita opcional com preview contextual (foto barbeiro, descrição serviço).

**Prós:**
- Mudança incremental, baixo risco.
- Resolve o problema de "resumo escondido no review" sem mexer na arquitetura do chat.
- Reaproveita 100% dos componentes existentes.

**Contras:**
- Centro ainda subutiliza espaço — chat continua estreito relativo à viewport.
- Sensação de "três colunas para preencher" se a coluna direita ficar vazia em estados iniciais.
- Não responde ao desejo de aproveitar o espaço de forma marcante.

### Alternativa C — Stepper desktop / chat mobile (dois layouts)

Em desktop, abandona chat e usa stepper horizontal no topo + cards lado-a-lado por etapa. Mobile mantém chat. Dois caminhos completamente independentes.

**Prós:**
- Cada plataforma com padrão de UI ideal.
- Desktop pode ter form-like UX padrão de e-commerce.

**Contras:**
- Dobra a superfície de manutenção e testes (16 testes hoje, viraria ~32).
- Quebra a identidade conversacional construída em `ChatContainer`, `BotMessage`, `UserMessage`.
- Perde os investimentos recentes em `SmartTimePicker`, `TimeSelectionFeedbackPanel`.

### Alternativa D — Hybrid live preview

Header com `BookingProgressSummary` sticky horizontal full-width (4 cards editáveis sempre visíveis). Esquerda 55% com chat (mais largo que hoje). Direita 45% com **Live Preview Card** que atualiza em tempo real conforme as escolhas (foto barbeiro + serviço + data formatada + horário com duração visual). Em `review` o preview vira o card de confirmação grande e os botões de ação migram para ele. Selectors continuam inline no chat (largura maior).

Mobile colapsa para layout atual (chat full-width, preview escondido até `review`).

**Prós:**
- Aproveita largura, mantém feel conversacional.
- Live preview "ganha vida" durante o fluxo — usuário vê o agendamento se materializando.
- Resumo sempre visível resolve o sumiço no review.
- Reaproveita componentes existentes (`ChatContainer`, selectors, `BookingProgressSummary`).
- Mobile fica intacto (zero risco para a maior fatia de tráfego).

**Contras:**
- Live preview precisa estados vazios bem desenhados (foto placeholder, skeleton).
- Mais complexidade que B (mas bem menos que C).
- Exige testes específicos de breakpoint (≥`lg`).

## Decisão

**Alternativa escolhida:** D — Hybrid live preview

## Razão

D entrega o melhor equilíbrio impacto × esforço:

- **Mobile preservado** — zero risco para o público dominante; layout atual é a base, desktop é progressive enhancement via Tailwind `lg:`.
- **Reuso de componentes** — `BookingProgressSummary`, `ChatContainer`, todos os selectors (`ChatBarberSelector`, `SmartTimePicker`, etc.) continuam servindo. Nenhuma reescrita.
- **Resolve dois problemas em uma feature** — desperdício de espaço em desktop **e** sumiço do resumo no review, sem precisar de mais um band-aid.
- **Storytelling visual** — o "live preview" cria um momento "uau" alinhado com o Brand Book (premium, conversacional, atencioso aos detalhes).
- **Manutenibilidade** — uma única árvore de componentes com responsividade Tailwind; testes existentes continuam válidos para a lógica de fluxo.

A alternativa B foi a runner-up: entregaria ~70% do valor com ~30% do esforço. Se aparecer pressão de prazo durante a implementação, a Fase 1 (resumo sticky horizontal) já entrega isolada — a Fase 2 (live preview) pode esperar.

## Referências

- `src/components/booking/ChatBookingPage.tsx` — componente principal a ser ajustado.
- `src/components/booking/BookingProgressSummary.tsx` — base do resumo sticky.
- `docs/Brand_Book_Gold_Mustache.md` — referência de identidade visual.
- `src/app/globals.css` — tokens de cor light/dark.
- `.kiro/specs/booking-smart-time-picker/` — spec ancestral, deve continuar funcionando dentro do novo layout.
