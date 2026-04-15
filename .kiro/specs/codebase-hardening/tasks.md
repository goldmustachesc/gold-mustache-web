# Plano de Implementação

- [x] 1. i18n — Strings não localizadas
  - [x] 1.1 Adicionar chaves `common.schedule`, `common.share`, `common.changeLanguage` em locales pt-BR, en, es
  - [x] 1.2 Atualizar `floating-booking-button.tsx` — usar `useTranslations`
  - [x] 1.3 Atualizar `share-button.tsx` — usar `useTranslations` para aria-label
  - [x] 1.4 Atualizar `language-switcher.tsx` — usar `useTranslations` para aria-labels
  - [x] 1.5 Atualizar testes (share-button, floating-booking-button, language-switcher) com mock next-intl
  _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Acessibilidade
  - [x] 2.1 `star-rating.tsx` — adicionar `role="img"` e `aria-label` em modo display
  _Requirements: 2.1_

- [x] 3. Design Tokens
  - [x] 3.1 Criar variáveis CSS `--elevator-bg/gold/gold-light/gold-shadow` em `globals.css`
  - [x] 3.2 `loading-elevator.tsx` — substituir cores hardcoded por CSS variables
  _Requirements: 3.1_

- [x] 4. Dead Code
  - [x] 4.1 Remover `navigation-menu.tsx` e test file associado
  _Requirements: 4.1_

- [x] 5. Auth Guards Consistentes
  - [x] 5.1 Converter `/admin/barbearia/configuracoes` — server component + ConfiguracoesPageClient
  - [x] 5.2 Converter `/admin/barbearia/horarios` — server component + HorariosPageClient
  - [x] 5.3 Converter `/admin/barbearia/servicos` — server component + ServicosPageClient
  - [x] 5.4 Converter `/admin/barbeiros` — server component + BarbeirosPageClient
  - [x] 5.5 Converter `/admin/barbeiros/[id]/horarios` — server component + BarberHorariosPageClient
  _Requirements: 5.1, 5.2_

- [x] 6. Service Layer
  - [x] 6.1 Criar `src/services/shop-hours.ts`
  - [x] 6.2 Criar `src/services/shop-closure.ts`
  - [x] 6.3 Criar `src/services/cookie-consent.ts`
  - [x] 6.4 Atualizar route handlers para usar novos services
  _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Testes Faltantes
  - [x] 7.1 Criar `src/services/__tests__/dashboard.test.ts` (23 testes)
  - [x] 7.2 Criar `src/hooks/__tests__/useRealtimeAppointments.test.tsx` (9 testes)
  - [x] 7.3 Criar `src/hooks/__tests__/useFeatureFlags.test.tsx` (6 testes)
  - [x] 7.4 Criar `src/lib/booking/__tests__/operational-appointments.test.ts` (11 testes)
  _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Housekeeping de Specs
  - [x] 8.1 Atualizar `.kiro/specs/faq-section/tasks.md` — 6 tasks marcadas com testes existentes
  - [x] 8.2 Atualizar `.kiro/specs/supabase-auth/tasks.md` — checkpoints 5 e 10 marcados
  _Requirements: 8.1, 8.2_

- [x] 9. Validação final
  - [x] 9.1 `pnpm test` — 2695 passed (4 falhas pré-existentes não relacionadas)
  - [x] 9.2 `pnpm biome check` — sem erros
  - [x] 9.3 `pnpm build` — build passa
