# Documento de Requisitos

## Introdução

Consolidação de gaps de qualidade identificados na auditoria: i18n, acessibilidade, design tokens, auth guards, service layer, dead code, cobertura de testes e housekeeping de specs.

## Requisitos

### Requisito 1 — Strings não localizadas

1. `floating-booking-button.tsx:36` — `"Agendar"` hardcoded SHALL usar chave i18n
2. `share-button.tsx:37` — `aria-label="Share"` SHALL usar chave i18n localizada
3. `language-switcher.tsx:99,164` — `aria-label="Change language"` SHALL usar chave i18n localizada

### Requisito 2 — Acessibilidade

1. `star-rating.tsx` — modo display (não interativo) SHALL ter `role="img"` e `aria-label` descritivo (ex: "4 de 5 estrelas")
2. Aria-labels de `share-button` e `language-switcher` SHALL ser localizados (coberto por Req 1)

### Requisito 3 — Design Tokens

1. `loading-elevator.tsx` — cores hardcoded (`#0B0B0B`, `#D4AF37`, `#E5C158`) SHALL ser substituídas por CSS variables definidas em `globals.css`

### Requisito 4 — Dead Code

1. `navigation-menu.tsx` — componente não utilizado SHALL ser removido

### Requisito 5 — Auth Guards Consistentes

1. Admin pages com auth guard client-side SHALL ser convertidas para server-side (usando `redirect()` do Next.js)
2. Páginas afetadas: `/admin/barbearia/configuracoes`, `/admin/barbearia/horarios`, `/admin/barbearia/servicos`, `/admin/barbeiros`, `/admin/barbeiros/[id]/horarios`

### Requisito 6 — Service Layer para Models Órfãos

1. `ShopHours` — lógica SHALL ser extraída de route handler para `src/services/shop-hours.ts`
2. `ShopClosure` — lógica SHALL ser extraída para `src/services/shop-closure.ts`
3. `CookieConsent` — lógica SHALL ser extraída para `src/services/cookie-consent.ts`

### Requisito 7 — Cobertura de Testes

1. `src/services/dashboard.ts` SHALL ter test file
2. `src/hooks/useRealtimeAppointments.ts` SHALL ter test file
3. `src/hooks/useFeatureFlags.ts` SHALL ter test file
4. `src/lib/booking/operational-appointments.ts` SHALL ter test file

### Requisito 8 — Housekeeping de Specs

1. `.kiro/specs/faq-section/tasks.md` — tasks cujos testes já existem SHALL ser marcadas como `[x]`
2. `.kiro/specs/supabase-auth/tasks.md` — checkpoints 5 e 10 SHALL ser revisados e marcados se aplicável
