# Coverage 90 Project Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** elevar a cobertura do projeto inteiro para no mínimo 90% em `lines`, `statements`, `functions` e `branches` sem maquiar a métrica e sem excluir código de negócio que deva permanecer no denominador.

**Architecture:** o trabalho será dividido em duas frentes: saneamento legítimo do escopo de coverage e aumento progressivo da cobertura por camadas, priorizando os arquivos com maior peso no denominador e menor cobertura atual. O plano ataca primeiro hooks, componentes e utilitários com grande impacto e baixa dependência externa, depois expande para páginas, APIs e integrações até endurecer o gate global.

**Tech Stack:** Vitest, Testing Library, happy-dom, Next.js App Router, React Query, Prisma, Supabase, Upstash.

---

## Baseline Atual

- Cobertura total atual:
  - `Lines: 67.15%`
  - `Statements: 66.67%`
  - `Functions: 64.94%`
  - `Branches: 61.29%`
- O escopo `all` hoje inclui `src/**/*.{ts,tsx}`, mas ainda exclui `src/app/**`, `src/i18n/**`, `src/lib/supabase/**`, `src/lib/auth/**`, `src/lib/prisma.ts` e `src/lib/validations/**`.
- Para cumprir a meta de 90% no projeto inteiro, será necessário:
  - revisar o escopo do coverage com critério técnico;
  - adicionar um volume alto de testes em componentes, hooks, libs e páginas;
  - depois endurecer o threshold global de `all`.

## Regras do Plano

- Não excluir código de negócio apenas para subir a métrica.
- Só excluir do coverage arquivos puramente declarativos ou estruturalmente não testáveis por unidade quando houver justificativa explícita.
- Todo aumento de cobertura deve vir acompanhado de teste útil, não teste cosmético.
- O threshold global de 90% só deve ser ligado depois que o projeto realmente atingir a meta.

## Arquivos de maior impacto já identificados

### Muito grandes e muito baixos

- `src/components/booking/ChatBookingPage.tsx`
- `src/components/dashboard/BarberDashboard.tsx`
- `src/components/dashboard/DailySchedule.tsx`
- `src/components/dashboard/WeeklyCalendar.tsx`
- `src/components/barber/ClientListPage.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useAdminLoyalty.ts`

### Grandes e zerados ou quase zerados

- `src/components/loyalty/RewardForm.tsx`
- `src/components/loyalty/RewardModal.tsx`
- `src/components/feedback/AdminFeedbacksPage.tsx`
- `src/components/feedback/AdminBarberFeedbacksPage.tsx`
- `src/components/feedback/BarberFeedbacksPage.tsx`
- `src/components/sections/HeroSection.tsx`
- `src/components/sections/InstagramSection.tsx`
- `src/components/sections/ServicesSection.tsx`
- `src/components/ui/language-switcher.tsx`
- `src/components/ui/carousel.tsx`
- `src/lib/pdf/financial-report.ts`
- `src/lib/guest-session.ts`
- `src/lib/instagram-cache.ts`
- `src/lib/working-hours.ts`
- `src/config/site.ts`
- `src/proxy.ts`

### Médios com branches especialmente fracos

- `src/hooks/useBooking.ts`
- `src/hooks/useBarberSchedulingForm.ts`
- `src/components/booking/BookingPage.tsx`
- `src/components/booking/ChatTimeSlotSelector.tsx`
- `src/components/dashboard/AppointmentCard.tsx`
- `src/components/loyalty/RewardCard.tsx`
- `src/components/private/PrivateSidebar.tsx`
- `src/components/layout/MobileNavOverlay.tsx`
- `src/lib/rate-limit.ts`

## Task 1: Congelar a régua de coverage

**Files:**
- Modify: `vitest.config.ts`
- Modify: `docs/test-coverage.md`
- Test: `coverage/coverage-summary.json`

**Step 1: Auditar os excludes atuais**

- Confirmar arquivo por arquivo se cada exclusão do escopo `all` ainda é legítima.
- Decisão preliminar:
  - manter excluídos: `src/i18n/**`, artefatos, configs geradas, `*.d.ts`.
  - revisar com cautela: `src/app/**`, `src/lib/validations/**`, `src/lib/auth/**`, `src/lib/supabase/**`.

**Step 2: Definir a régua final**

- Criar um comando final de verificação para o projeto inteiro com meta de 90% em todas as métricas.
- Não subir o threshold de `all` para 90% antes da cobertura real chegar perto da meta.

**Step 3: Atualizar a documentação**

- Ajustar `docs/test-coverage.md` para refletir a nova interpretação de “projeto inteiro”.

**Step 4: Verificar o baseline**

Run: `pnpm test:coverage:all`
Expected: relatório atualizado e baseline preservado para comparação.

## Task 2: Fechar os buracos de hooks e libs de alto ROI

**Files:**
- Modify: `src/hooks/__tests__/useAuth.test.tsx`
- Modify: `src/hooks/__tests__/useAdminLoyalty.test.tsx` ou criar se não existir
- Modify: `src/hooks/__tests__/useBooking.test.tsx`
- Modify: `src/hooks/__tests__/useBarberSchedulingForm.test.tsx`
- Create/Modify: `src/lib/__tests__/guest-session.test.ts`
- Create/Modify: `src/lib/__tests__/instagram-cache.test.ts`
- Create/Modify: `src/lib/__tests__/working-hours.test.ts`
- Create/Modify: `src/lib/__tests__/safe-action.test.ts`
- Modify: `src/lib/__tests__/rate-limit.test.ts`
- Create/Modify: `src/config/__tests__/site.test.ts`

**Step 1: Escrever testes faltantes para módulos zerados**

- `useAuth`
- `useAdminLoyalty`
- `guest-session`
- `instagram-cache`
- `working-hours`
- `config/site`

**Step 2: Cobrir branches faltantes dos módulos parcialmente testados**

- `useBooking`
- `useBarberSchedulingForm`
- `rate-limit`
- `safe-action`

**Step 3: Rodar a suíte focal**

Run: `pnpm test -- --runInBand src/hooks src/lib src/config`
Expected: novos testes passando e aumento perceptível em branches/functions.

## Task 3: Cobrir componentes críticos de booking e dashboard

**Files:**
- Modify: `src/components/booking/__tests__/ChatBookingPage.test.tsx`
- Modify: `src/components/booking/__tests__/BookingPage.test.tsx`
- Modify: `src/components/booking/chat/__tests__/ChatTimeSlotSelector.test.tsx`
- Create/Modify: `src/components/dashboard/__tests__/BarberDashboard.test.tsx`
- Create/Modify: `src/components/dashboard/__tests__/DailySchedule.test.tsx`
- Create/Modify: `src/components/dashboard/__tests__/WeeklyCalendar.test.tsx`
- Create/Modify: `src/components/dashboard/__tests__/MyLinkCard.test.tsx`
- Modify: `src/components/dashboard/__tests__/AppointmentCard.test.tsx`

**Step 1: Escrever testes dos componentes grandes e pouco cobertos**

- atacar renderização condicional;
- estados vazios;
- loading/error;
- callbacks de ação;
- ramificações por perfil e status.

**Step 2: Rodar apenas os testes de booking/dashboard**

Run: `pnpm test -- src/components/booking src/components/dashboard`
Expected: aumento forte em `lines`, `functions` e `branches`.

## Task 4: Cobrir CRUDs e modais administrativos zerados

**Files:**
- Modify: `src/components/barber/__tests__/ClientListPage.test.tsx`
- Create/Modify: `src/components/barber/__tests__/EditClientDialog.test.tsx`
- Create/Modify: `src/components/barber/__tests__/BanClientDialog.test.tsx`
- Create/Modify: `src/components/barber/__tests__/UnbanClientDialog.test.tsx`
- Create/Modify: `src/components/barber/__tests__/ClientHistoryDialog.test.tsx`
- Create/Modify: `src/components/feedback/__tests__/AdminFeedbacksPage.test.tsx`
- Create/Modify: `src/components/feedback/__tests__/AdminBarberFeedbacksPage.test.tsx`
- Create/Modify: `src/components/feedback/__tests__/BarberFeedbacksPage.test.tsx`
- Create/Modify: `src/components/feedback/__tests__/FeedbackModal.test.tsx`
- Create/Modify: `src/components/loyalty/__tests__/RewardForm.test.tsx`
- Create/Modify: `src/components/loyalty/__tests__/RewardModal.test.tsx`

**Step 1: Validar cenários de interação**

- formulários válidos e inválidos;
- modais abrindo/fechando;
- estados vazios;
- callbacks de sucesso/erro;
- regras condicionais por role.

**Step 2: Rodar a suíte focal**

Run: `pnpm test -- src/components/barber src/components/feedback src/components/loyalty`
Expected: redução relevante do volume de arquivos zerados.

## Task 5: Cobrir landing e componentes públicos zerados

**Files:**
- Create/Modify: `src/components/sections/__tests__/HeroSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/InstagramSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/ServicesSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/SponsorsSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/TeamSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/TestimonialsSection.test.tsx`
- Create/Modify: `src/components/sections/__tests__/ContactSection.test.tsx`
- Create/Modify: `src/components/ui/__tests__/language-switcher.test.tsx`
- Create/Modify: `src/components/ui/__tests__/carousel.test.tsx`
- Create/Modify: `src/components/ui/__tests__/theme-toggle.test.tsx`
- Create/Modify: `src/components/ui/__tests__/optimized-image.test.tsx`
- Create/Modify: `src/components/analytics/__tests__/GoogleAnalytics.test.tsx`
- Create/Modify: `src/components/analytics/__tests__/GoogleTagManager.test.tsx`
- Create/Modify: `src/components/seo/__tests__/SchemaMarkup.test.tsx`

**Step 1: Cobrir renderização pública e toggles de ambiente**

- renderização base;
- feature flags por ambiente;
- estados com e sem dados;
- links críticos e chamadas analíticas condicionais.

**Step 2: Rodar a suíte focal**

Run: `pnpm test -- src/components/sections src/components/ui src/components/analytics src/components/seo`
Expected: melhora ampla em vários arquivos zerados e médios.

## Task 6: Decidir e atacar `src/app/**`

**Files:**
- Modify: `vitest.config.ts`
- Create/Modify: `src/app/**/__tests__/*.test.ts(x)`

**Step 1: Decisão arquitetural**

- Para cumprir “90% no projeto inteiro”, decidir se `src/app/**` deve entrar no denominador final.
- Recomendação: incluir pelo menos páginas e layouts com lógica condicional real e manter fora apenas entrypoints puramente estruturais, se tecnicamente justificado.

**Step 2: Cobrir as páginas de maior valor**

- páginas protegidas;
- páginas de auth;
- páginas públicas com lógica;
- layouts com feature flags, analytics ou i18n operacional.

**Step 3: Rodar cobertura do escopo completo**

Run: `pnpm test:coverage:all`
Expected: impacto real do `src/app/**` conhecido antes de endurecer o gate.

## Task 7: Cobrir integrações utilitárias e infraestrutura de borda

**Files:**
- Create/Modify: `src/proxy.test.ts`
- Create/Modify: `src/providers/__tests__/query-provider.test.tsx`
- Create/Modify: `src/components/providers/__tests__/ThemeProvider.test.tsx`
- Create/Modify: `src/lib/pdf/__tests__/financial-report.test.ts`
- Create/Modify: `src/lib/__tests__/redis.test.ts`

**Step 1: Cobrir infraestrutura com mocks controlados**

- middleware/proxy;
- providers;
- geração de PDF;
- clientes de cache/redis.

**Step 2: Rodar a suíte focal**

Run: `pnpm test -- src/proxy.ts src/providers src/lib/pdf src/lib`
Expected: eliminação dos últimos arquivos estruturais com 0%.

## Task 8: Endurecer o gate global

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `docs/test-coverage.md`

**Step 1: Subir threshold de `all` para 90%**

- `lines: 90`
- `functions: 90`
- `statements: 90`
- `branches: 90`

**Step 2: Criar ou ajustar comando oficial**

- garantir que `pnpm test:gate:full` ou um comando equivalente valide a meta global inteira.

**Step 3: Rodar o gate completo**

Run: `pnpm test:gate:full`
Expected: PASS com todas as métricas globais em 90%+.

## Task 9: Verificação final e decisão de produção

**Files:**
- Modify: `docs/checklist-prontidao-producao.md`
- Test: `coverage/coverage-summary.json`

**Step 1: Rodar verificação final**

Run: `pnpm lint && pnpm test:gate:full && pnpm build`
Expected: PASS completo.

**Step 2: Atualizar o checklist de prontidão**

- registrar a evidência de cobertura;
- marcar o item de gate técnico;
- atualizar o parecer de prontidão se não houver bloqueadores adicionais.

## Ordem recomendada de execução

1. `Task 1`
2. `Task 2`
3. `Task 3`
4. `Task 4`
5. `Task 5`
6. `Task 6`
7. `Task 7`
8. `Task 8`
9. `Task 9`

## Critério de sucesso

- `coverage-summary.json` com pelo menos 90% em `lines`, `statements`, `functions` e `branches`.
- `pnpm test:gate:full` verde com a nova régua.
- sem exclusões artificiais de código de negócio para inflar resultado.
- sem regressões nos fluxos críticos ao longo do aumento de cobertura.
