# Auditoria de Identidade Visual - Gold Mustache

**Data:** 2026-01-20  
**Referência:** `docs/Brand_Book_Gold_Mustache.md`

---

## Resumo Executivo

O projeto está **~75% alinhado** com o Brand Book. As cores e o sistema dual Light/Dark estão corretos. Os principais gaps estão em **tipografia** (uso inconsistente de Playfair), **tokens semânticos** e **tom de voz**.

---

## Conformidades (OK)

| Item | Status | Observação |
|------|--------|------------|
| Cores primárias (Gold) | ✅ | `oklch(0.65 0.15 85)` correto |
| Dark mode (Zinc tones) | ✅ | Implementado corretamente |
| Border radius tokens | ✅ | sm=6px, md=8px, lg=10px, xl=14px |
| Lucide Icons | ✅ | Biblioteca correta, estilo stroke |
| Geist Sans/Mono | ✅ | Declaradas no tema |
| Header logo com Playfair | ✅ | `font-playfair` aplicado |
| Hero tagline com Playfair | ✅ | `font-playfair` aplicado |

---

## Não Conformidades (Gaps)

### FASE 1: Tipografia (Alta Prioridade)

**Problema:** Títulos de seção (`h2`, `h3`) não usam Playfair Display.

| Arquivo | Linha | Atual | Esperado |
|---------|-------|-------|----------|
| `ServicesSection.tsx` | 75-77 | `font-bold` | `font-playfair font-bold` |
| `TeamSection.tsx` | ~30 | `font-bold` | `font-playfair font-bold` |
| `FAQSection.tsx` | ~25 | `font-bold` | `font-playfair font-bold` |
| `ContactSection.tsx` | ~30 | `font-bold` | `font-playfair font-bold` |
| `GallerySection.tsx` | ~25 | `font-bold` | `font-playfair font-bold` |
| `TestimonialsSection.tsx` | ~25 | `font-bold` | `font-playfair font-bold` |
| `EventsSection.tsx` | ~25 | `font-bold` | `font-playfair font-bold` |
| `SponsorsSection.tsx` | ~25 | `font-bold` | `font-playfair font-bold` |

**Regra Brand Book:** 
> Playfair Display para títulos principais, logo, elementos de destaque premium.

**Ação:** Adicionar `font-playfair` em todos os `h2` e `h3` de seções.

---

### FASE 2: Tokens Semânticos de Status (Média Prioridade)

**Problema:** Cores de status (sucesso, erro, alerta) usam classes Tailwind hardcoded ao invés de tokens.

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `BookingConfirmation.tsx` | `text-green-600`, `bg-green-50` | Criar tokens `--success`, `--success-foreground` |
| `AppointmentCard.tsx` | Status badges com cores diretas | Usar tokens semânticos |
| `toast` calls | Variantes hardcoded | Padronizar com tokens |

**Brand Book define:**
- Success: `#22C55E`
- Error: `oklch(0.577 0.245 27.325)` (já existe como `--destructive`)
- Warning: `#EAB308`
- Info: `#3B82F6`

**Ação:** Adicionar tokens em `globals.css`:

```css
:root {
  --success: oklch(0.627 0.194 142.5); /* #22C55E */
  --success-foreground: oklch(0.98 0.01 85);
  --warning: oklch(0.795 0.184 86.05); /* #EAB308 */
  --warning-foreground: oklch(0.15 0.02 85);
  --info: oklch(0.588 0.213 259.8); /* #3B82F6 */
  --info-foreground: oklch(0.98 0.01 85);
}
```

---

### FASE 3: Tom de Voz (Baixa Prioridade)

**Problema:** Algumas mensagens usam tom informal ou exclamações desnecessárias.

| Arquivo | Atual | Brand Book sugere |
|---------|-------|-------------------|
| `BookingConfirmation.tsx:38` | "Agendamento Confirmado!" | "Agendamento confirmado." |
| `BookingConfirmation.tsx:98` | "Ver Meus Agendamentos" | "Meus agendamentos" |
| `BookingConfirmation.tsx:101` | "Fazer Novo Agendamento" | "Agendar outro horário" |
| Vários toasts | Mensagens com emojis | Remover emojis exceto em WhatsApp |

**Ação:** Revisar strings em:
- `src/components/booking/`
- `src/i18n/locales/pt-BR/booking.json`
- Toast notifications

---

### FASE 4: Geist Mono para Dados Técnicos (Baixa Prioridade)

**Problema:** Horários, preços e códigos não usam `font-mono`.

| Contexto | Atual | Esperado |
|----------|-------|----------|
| Horários de agendamento | `text-sm` | `font-mono text-sm` |
| Preços em cards | `font-bold` | `font-mono font-bold` |
| Códigos de agendamento | Sem mono | `font-mono` |

**Brand Book:**
> Geist Mono para horários, preços, códigos de agendamento e dados técnicos.

**Ação:** Aplicar `font-mono` em:
- `AppointmentCard.tsx` - horários e preços
- `BookingConfirmation.tsx` - horários e preços
- `BookingReview.tsx` - horários e preços

---

## Plano de Execução

### Fase 1 - Tipografia (Estimativa: ~30 arquivos)
1. Criar busca por `text-3xl.*font-bold|text-4xl.*font-bold` em seções
2. Adicionar `font-playfair` aos títulos `h2`/`h3`
3. Verificar CardTitle em cards de destaque
4. Testar visual em Light e Dark mode

### Fase 2 - Tokens Semânticos (~15 arquivos)
1. Adicionar tokens CSS em `globals.css`
2. Criar variantes de componentes (button, badge, alert)
3. Refatorar componentes que usam cores hardcoded
4. Atualizar Tailwind config se necessário

### Fase 3 - Tom de Voz (~20 arquivos)
1. Auditar todos os arquivos de tradução
2. Auditar strings hardcoded em componentes
3. Remover exclamações e emojis (exceto WhatsApp)
4. Revisar CTAs para tom direto

### Fase 4 - Geist Mono (~10 arquivos)
1. Identificar todos os locais com dados técnicos
2. Aplicar `font-mono` 
3. Verificar legibilidade

---

## Arquivos Prioritários para Revisão

```
src/components/sections/*.tsx          # Tipografia h2/h3
src/components/booking/*.tsx           # Tokens + Mono + Tom
src/components/ui/card.tsx             # CardTitle com Playfair?
src/app/globals.css                    # Tokens semânticos
src/i18n/locales/pt-BR/booking.json    # Tom de voz
```

---

## Checklist de Validação

- [ ] Todos os `h2` de seções usam `font-playfair`
- [ ] Tokens `--success`, `--warning`, `--info` criados
- [ ] Componentes de status usam tokens (não cores diretas)
- [ ] Horários e preços usam `font-mono`
- [ ] Mensagens sem exclamações desnecessárias
- [ ] CTAs diretos ("Agendar horário", não "Clique aqui para agendar")
- [ ] Emojis apenas em mensagens WhatsApp

---

## Notas

1. **Não quebrar dark mode** - Todas as mudanças devem funcionar em ambos os modos
2. **Manter acessibilidade** - Contraste de cores deve permanecer adequado
3. **Testar mobile** - Tipografia deve escalar bem
4. **Incremental** - Fazer por fases para evitar regressões
