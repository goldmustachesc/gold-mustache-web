# Tasks — booking-desktop-redesign

> Tier Full. Ordem de implementação otimizada para entrega incremental: cada bloco compila, passa nos testes existentes e pode virar PR isolado se necessário.

## Fase 1 — Base estrutural (baixo risco, alto valor)

- [ ] **T1.1** Restaurar `BookingProgressSummary` em `review`
  - Arquivo: `src/components/booking/ChatBookingPage.tsx`.
  - Remover a condicional `{step !== "review" && ...}` em volta do summary do header.
  - Atualizar `ChatBookingPage.flow.test.tsx` com regressão garantindo summary visível em `review`.
  - Critério: 16 testes existentes continuam passando + 1 novo.

- [ ] **T1.2** Adicionar variante `horizontal-sticky` em `BookingProgressSummary`
  - Arquivo: `src/components/booking/BookingProgressSummary.tsx`.
  - Nova prop opcional `variant?: "default" | "horizontal-sticky"`.
  - `horizontal-sticky` aplica `bg-background/95 backdrop-blur` e remove título visual (mantém `aria-label`).
  - Atualizar `BookingProgressSummary.test.tsx` cobrindo a nova variante.

- [ ] **T1.3** Tornar o summary do header sticky
  - Wrapper do summary em `ChatBookingPage.tsx` ganha `sticky top-0 z-10`.
  - Validar que não cobre conteúdo no scroll (padding/margens adequados).
  - Validar light/dark mode visualmente em `pnpm dev`.

## Fase 2 — Live Preview (componente novo)

- [ ] **T2.1** Criar `BookingLivePreview.tsx` (red phase)
  - Arquivo: `src/components/booking/__tests__/BookingLivePreview.test.tsx` primeiro.
  - Casos cobertos:
    - Renderiza estado vazio sem props selecionadas.
    - Mostra barbeiro quando `barber` é fornecido.
    - Mostra serviço com duração e preço.
    - Mostra data por extenso (Quinta-feira, 1 de maio de 2026).
    - Mostra faixa de horário usando `calculateEndTime`.
    - Em `step="review"` + guest, renderiza dados do cliente.
    - Em `step="review"` renderiza CTAs "Confirmar agendamento" e "Voltar e editar".
    - `isConfirming=true` desabilita CTAs.
    - Dispara `onConfirm`, `onBackFromReview`, `onEditCustomerData` corretamente.

- [ ] **T2.2** Implementar `BookingLivePreview.tsx` (green phase)
  - Arquivo: `src/components/booking/BookingLivePreview.tsx`.
  - Props conforme `design.md` §Componentes.
  - Layout: card root + slots (barbeiro / serviço / data+horário / cliente / CTAs) + estado vazio.
  - Animações com `motion-safe:` e `motion-reduce:`.
  - Tokens light/dark via `bg-card`, `text-foreground`, etc.

- [ ] **T2.3** Refatorar para clareza (refactor phase)
  - Extrair sub-componentes locais se algum slot passar de ~30 linhas (ex.: `LivePreviewBarberSlot`).
  - Garantir `min-h` em cada slot para evitar layout shift.

## Fase 3 — Integração no `ChatBookingPage`

- [ ] **T3.1** Extrair `BookingHeader.tsx`
  - Arquivo: `src/components/booking/BookingHeader.tsx`.
  - Props: `{ onReset: () => void; canReset: boolean }`.
  - Substituir o header inline em `ChatBookingPage.tsx`.
  - Teste rápido: `BookingHeader.test.tsx` (smoke + click reset).

- [ ] **T3.2** Implementar split layout em `ChatBookingPage.tsx`
  - Wrapper principal vira `flex flex-col`.
  - Após o sticky summary, container `flex flex-1 gap-4 overflow-hidden lg:gap-6`.
  - `ChatContainer` ganha classe `flex-1 lg:flex-[1.2]`.
  - `<aside aria-label="Prévia do agendamento" className="hidden lg:flex lg:flex-[1] lg:flex-col">` envolvendo `<BookingLivePreview ...props />`.
  - Em `xl`: aplicar `xl:max-w-[1400px] xl:mx-auto` no container.

- [ ] **T3.3** Ocultar bloco de revisão duplicado em desktop
  - No `renderSelector` `case "review"`, envolver o wrapper com `lg:hidden` ou condicional CSS.
  - Live Preview assume os CTAs em `lg`.
  - Mobile/tablet (<lg) mantém comportamento atual.

- [ ] **T3.4** Atualizar `index.ts` de `src/components/booking/`
  - Exportar `BookingLivePreview` e `BookingHeader` se necessário pelo padrão atual.

## Fase 4 — Testes de integração

- [ ] **T4.1** Atualizar `ChatBookingPage.test.tsx`
  - Garantir 16 testes existentes continuam verdes.
  - Adicionar mock de viewport (`window.innerWidth = 1280`) e teste cobrindo: Live Preview presente, CTAs no Live Preview e não no chat.

- [ ] **T4.2** Atualizar `ChatBookingPage.flow.test.tsx`
  - Regressão completa do fluxo em viewport mockado desktop:
    - Selecionar barbeiro → preview atualiza.
    - Selecionar serviço → preview atualiza.
    - Selecionar data → preview atualiza.
    - Selecionar horário → preview mostra faixa.
    - Em `review`, clicar "Confirmar" pelo Live Preview chama o handler correto.
  - Confirmar que viewport mobile (default jsdom) continua usando o fluxo original.

- [ ] **T4.3** Smoke test manual
  - `pnpm dev` em `http://localhost:3001/pt-BR/agendar`.
  - Validar visualmente: lg breakpoint, light/dark mode, animações, estado vazio, fluxo completo até confirmação.
  - Validar tablet (768px) — single-column ativo.
  - Validar zoom 200% — não quebra.

## Fase 5 — Polimento e documentação

- [ ] **T5.1** Acessibilidade
  - Rodar `axe` ou similar manualmente em `pnpm dev`.
  - Validar foco navegável por teclado (tab order: header → summary → chat → preview).
  - `prefers-reduced-motion` testado em DevTools.

- [ ] **T5.2** Atualizar copy/strings
  - Revisar nomes em pt-BR para consistência ("Suas escolhas aparecerão aqui em tempo real", "Confirme seu agendamento", etc.).
  - Conferir que não há strings hardcoded duplicadas (preferir constants se aparecer ≥3×).

- [ ] **T5.3** Atualizar `spec.json`
  - `phase: "implementation"`, `approvals.tasks.approved: true` (após review humano).
  - `ready_for_implementation: true`.

- [ ] **T5.4** PR final
  - Conventional commit: `feat(booking): redesenha layout desktop com live preview`.
  - PR description: link para `.kiro/specs/booking-desktop-redesign/`, screenshots desktop+mobile, checklist de gates (`pnpm test:gate`).

## Validação final (gates)

- [ ] `pnpm lint` — sem warnings.
- [ ] `pnpm test` — 100% verde.
- [ ] `pnpm test:gate` — coverage não regride.
- [ ] `pnpm build` — sem erros.
- [ ] Verificação manual visual em desktop, tablet e mobile.
- [ ] Light/Dark mode validados.
- [ ] Brand Book conferido (dourado nos CTAs e destaques de preço).

## Pendências para revisão humana

Antes de iniciar a Fase 2, decidir:

1. Posição da foto do barbeiro no Live Preview (lado a lado vs. destaque grande).
2. Comportamento em tablet (768–1023px) — confirmar single-column.
3. Animação entre steps (por slot vs. global).
4. Aprovar paleta dourada nos CTAs do Live Preview.
