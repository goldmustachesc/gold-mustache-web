# Design — booking-desktop-redesign

## Visão geral

Introduzimos um layout split (chat à esquerda, Live Preview à direita) ativo em `lg:` (≥1024px), com `BookingProgressSummary` sticky horizontal acima das duas colunas. Mobile e tablet (<1024px) permanecem com o single-column atual. O componente `BookingLivePreview` é novo e consome o mesmo estado já existente em `ChatBookingPage` (props drilling — sem novo store).

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Novo Agendamento [↻ Recomeçar]                            │
├────────────────────────────────────────────────────────────────────┤
│  [Barbeiro][Serviço][Data][Horário]  ← BookingProgressSummary      │
│  sticky, full width, sempre visível                                │
├──────────────────────────────────┬─────────────────────────────────┤
│                                  │                                 │
│  ChatContainer                   │  BookingLivePreview             │
│  (BotMessage / UserMessage /     │  - Estado vazio inicial         │
│   selectors / typing indicator)  │  - Card barbeiro (foto+nome)    │
│                                  │  - Card serviço (nome/duração)  │
│  Largura: ~55% (lg:flex-[1.2])   │  - Card data + horário          │
│                                  │  - Em review: botões CTA        │
│                                  │                                 │
└──────────────────────────────────┴─────────────────────────────────┘
                                  ↑
                         lg:flex-[1] (~45%)
```

Em `<lg`:

```
┌────────────────────────────────┐
│ Header                         │
├────────────────────────────────┤
│ Summary horizontal (sticky)    │
├────────────────────────────────┤
│ ChatContainer (full width)     │
│  - selectors inline no chat    │
│  - em review: botões inline    │
│  - LivePreview oculto          │
└────────────────────────────────┘
```

## Componentes

### `ChatBookingPage.tsx` (modificado)

Estrutura JSX nova (simplificada):

```tsx
<div className="flex flex-col h-[calc(100dvh-120px)]">
  {/* Header */}
  <BookingHeader onReset={handleNewBooking} hasMessages={messages.length > 0} />

  {/* Sticky summary — único, sempre visível */}
  <div className="sticky top-0 z-10 mt-3 ...">
    <BookingProgressSummary items={progressItems} variant="horizontal-sticky" />
  </div>

  {/* Split content */}
  <div className="mt-3 flex flex-1 gap-4 overflow-hidden lg:gap-6">
    <ChatContainer className="flex-1 lg:flex-[1.2]">
      {/* mensagens + selector + typing */}
    </ChatContainer>

    <aside
      className="hidden lg:flex lg:flex-[1] lg:flex-col"
      aria-label="Prévia do agendamento"
    >
      <BookingLivePreview
        barber={selectedBarber}
        service={selectedService}
        date={selectedDate}
        slot={selectedSlot}
        guestInfo={guestInfo}
        isGuest={isGuest}
        step={step}
        onConfirm={handleConfirmBooking}
        onBackFromReview={handleBackFromReview}
        onEditCustomerData={handleEditCustomerData}
        isConfirming={
          createAppointment.isPending || createGuestAppointment.isPending
        }
      />
    </aside>
  </div>
</div>
```

**Mudanças adicionais:**

- Remover o `step !== "review"` que esconde o summary (atualmente em `ChatBookingPage.tsx:1006`). Summary fica sempre visível (exceto em `confirmation`, que renderiza retorno antecipado).
- Em desktop, no `renderSelector` para `case "review"`, ocultar os botões e o card de cliente (eles migram para o `BookingLivePreview`). A condicional usa hook `useMatchMedia`/CSS — preferir CSS via classes Tailwind (`hidden lg:hidden`) para não duplicar lógica.
- O bloco de revisão dentro do chat passa a renderizar apenas em `<lg` (aplicar `lg:hidden` no wrapper).

### `BookingLivePreview.tsx` (novo)

Local: `src/components/booking/BookingLivePreview.tsx`.

```tsx
interface BookingLivePreviewProps {
  barber: BarberData | null;
  service: ServiceData | null;
  date: Date | null;
  slot: TimeSlot | null;
  guestInfo: { clientName: string; clientPhone: string } | null;
  isGuest: boolean;
  step: BookingStep;
  isConfirming: boolean;
  onConfirm: () => void;
  onBackFromReview: () => void;
  onEditCustomerData: () => void;
}
```

Layout interno (Card root com `rounded-2xl`, gradient sutil light/dark):

1. **Header do card**: título dinâmico
   - Sem nada selecionado → "Seu agendamento"
   - Em review → "Confirme seu agendamento"
2. **Slot 1 — Barbeiro**: avatar (fallback iniciais) + nome. Empty: ícone `Scissors` em muted + "Escolha um barbeiro".
3. **Slot 2 — Serviço**: ícone + nome + duração ("45 min") + preço ("R$ 100,00"). Empty: ícone + "Escolha um serviço".
4. **Slot 3 — Data e horário**: combinado em um bloco. Data por extenso ("Quinta-feira, 1 de maio"). Faixa de horário ("09:00 — 09:45"). Empty: "Escolha data e horário".
5. **Slot 4 — Cliente** (apenas em review):
   - Guest: nome + telefone formatado.
   - Logado: "Cadastro pronto para confirmar."
   - Botão `PencilLine` "Editar dados".
6. **CTA footer** (apenas em review):
   - `Button` primário "Confirmar agendamento" (loading state).
   - `Button outline` "Voltar e editar".
7. **Estado vazio total** (nada selecionado, etapa ≠ review): ilustração simples (`Sparkles` ou ícone do calendar) + mensagem "Suas escolhas aparecerão aqui em tempo real".

**Animações**: cada slot anima `animate-in fade-in slide-in-from-bottom-1 duration-300` quando seu valor sai de `null` para preenchido. Respeitar `prefers-reduced-motion` via Tailwind `motion-safe:` / `motion-reduce:`.

**Tokens visuais**: usar `bg-card`, `border`, `text-foreground`, `text-muted-foreground`, `bg-primary/10` (mesmos tokens do `BookingProgressSummary`). Brand Book: dourado para destaques de preço/CTA.

### `BookingProgressSummary.tsx` (ajuste menor)

Adicionar prop opcional `variant: "default" | "horizontal-sticky"` (default mantém comportamento atual). `horizontal-sticky` aplica:

- `grid-cols-2 gap-2 lg:grid-cols-4` (já é o padrão atual após commit recente).
- Remove o título "Resumo do agendamento" e usa `aria-label` invisível.
- Adiciona `bg-background/95 backdrop-blur` para legibilidade quando sticky.

Alternativa: criar `<BookingProgressSummarySticky>` wrapper. Decidi pela prop por simplicidade — o componente é pequeno e a variante não muda a forma do array de items.

### `BookingHeader.tsx` (extração opcional)

Header atual ocupa ~20 linhas em `ChatBookingPage.tsx`. Extrair para `src/components/booking/BookingHeader.tsx` reduz ruído no componente principal e facilita testar isoladamente. Props: `{ onReset, canReset }`.

Trade-off: extra arquivo vs. clareza. Vale a pena dado que `ChatBookingPage` já passa de 1000 linhas.

## Fluxo de dados

`ChatBookingPage` continua sendo o **único orchestrator de estado** (sem Context novo, sem Zustand). `BookingLivePreview` recebe props e dispara callbacks. Vantagens:

- Zero impacto em testes existentes (lógica fica no mesmo lugar).
- Sem risco de race conditions com `processedStepsRef`.
- Fácil reverter se necessário (basta esconder a `<aside>`).

`BookingHeader` recebe `onReset` e `canReset` (booleano). Sem estado local.

## Responsividade e breakpoints

| Breakpoint   | Largura       | Layout                                     |
|--------------|---------------|--------------------------------------------|
| `<md`        | <768px        | Single-column (mobile)                     |
| `md`         | 768–1023px    | Single-column (tablet — evita split apertado) |
| `lg`         | 1024–1279px   | Split 1.2:1 (chat ligeiramente maior)      |
| `xl`         | ≥1280px       | Split 1:1 com `max-w-[1400px] mx-auto`     |

CSS-first, sem `useMediaQuery` em JS. As variantes ficam via classes `hidden lg:flex` etc.

## Acessibilidade

- `<aside aria-label="Prévia do agendamento">` para a coluna direita.
- `<section aria-label="Conversa de agendamento">` na ChatContainer.
- Sticky summary mantém ordem do DOM antes do split (skip-link natural via tab).
- Botões "Editar" no summary preservam `aria-label` ("Editar barbeiro", etc.) já existente em `BookingProgressSummary`.
- Live Preview CTAs em review com `aria-busy={isConfirming}`.
- Animações respeitam `prefers-reduced-motion`.

## Estados e transições

| Estado                          | Chat                | Live Preview                |
|---------------------------------|---------------------|-----------------------------|
| `greeting`                      | mensagem boas-vindas| empty state                 |
| `barber`                        | selector            | empty state                 |
| `service`                       | selector            | mostra barbeiro             |
| `date`                          | selector            | mostra barbeiro+serviço     |
| `time`                          | SmartTimePicker     | mostra barb+serv+data       |
| `profile-update` / `info`       | form                | mostra barb+serv+data+hora  |
| `review`                        | (oculto em desktop) | full preview + CTAs         |
| `confirming`                    | "Confirmando..."    | CTAs disabled, spinner      |
| `confirmation`                  | substituído pelo    | substituído pelo            |
|                                 | `BookingConfirmation` (ocupa toda a área) |   |

## Testes

### Novos arquivos

- `BookingLivePreview.test.tsx`
  - Renderiza estado vazio quando nada está selecionado.
  - Mostra barbeiro quando `barber` é fornecido.
  - Mostra serviço com duração e preço.
  - Mostra data por extenso e faixa de horário.
  - Em `step === "review"`, renderiza botões "Confirmar" e "Voltar e editar".
  - Em `step === "review"` + guest, mostra dados do cliente e botão "Editar dados".
  - `isConfirming = true` → botão CTA desabilitado e com spinner.
  - Empty state respeita `prefers-reduced-motion`.

### Atualizações

- `ChatBookingPage.test.tsx` e `ChatBookingPage.flow.test.tsx`:
  - Adicionar regressão: summary aparece em `review`.
  - Adicionar regressão: em viewport mock ≥1024px, botões de confirmação aparecem no Live Preview e não duplicados no chat.
  - Garantir que mobile (default jsdom width) continua passando os 16 testes atuais.

Para mockar viewport: `Object.defineProperty(window, 'innerWidth', { value: 1280 })` + `window.dispatchEvent(new Event('resize'))`. Como o layout é puro CSS, basta verificar presença/ausência de elementos via `data-testid` ou consultas específicas.

## Brand Book / Visual

- Live Preview card usa `bg-card`, borda `border-border`, sombra `shadow-sm`.
- Detalhe dourado (`text-primary` / `bg-primary/10`) para preço e título do CTA.
- Avatar do barbeiro: círculo, ring sutil em `border-primary/20`.
- Empty states com `text-muted-foreground` e ícones `lucide-react` no tom muted.
- Transições suaves (`transition-colors`, `transition-shadow`).

## Riscos e mitigações

| Risco                                              | Mitigação                                                              |
|----------------------------------------------------|------------------------------------------------------------------------|
| Duplicar lógica de revisão (chat e preview)        | Extrair função pura `renderReviewActions(props)` ou condicionais CSS — preferir CSS. |
| Layout shift quando preview popula                 | `min-h` fixo no card e em cada slot.                                   |
| Breakpoint mal escolhido (tablet split apertado)   | Forçar single-column até `lg` (1024px), validar com tablet real.       |
| Foto de barbeiro indisponível                      | Fallback iniciais (já existe no projeto).                              |
| Sticky summary cobrindo conteúdo no scroll         | `top-0`, `bg-background/95 backdrop-blur`, padding adequado abaixo.    |
| Regressão em testes mobile                         | Manter selectors no chat em mobile; ajustar testes só em desktop mock. |

## Plano de rollback

Se o split causar problemas em produção:

1. Toggle: encapsular `<aside>` numa flag `enableDesktopSplit` em `src/config/flags.ts` (criar arquivo se não existir).
2. Setar `false` desabilita o split; chat volta ao centro.
3. `BookingProgressSummary` em `review` continua visível (correção mantida).
4. Reverter via PR isolado se necessário.

## Decisões abertas para review humano

1. **Posição da foto do barbeiro**: lado a lado com nome ou em destaque grande no topo do card?
2. **Tablet (768–1023px)**: confirmar que single-column é o desejado (alternativa: stack vertical do summary + preview).
3. **Live Preview animar entre steps**: animação por slot ou animação global do card? Default proposto: por slot.
4. **Brand Book check**: confirmar que a paleta dourada se aplica ao CTA "Confirmar agendamento".
