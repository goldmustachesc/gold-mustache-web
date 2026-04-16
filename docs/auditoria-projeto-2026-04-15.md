# Auditoria Completa — Gold Mustache Web

**Data:** 2026-04-15
**Branch:** staging (commit `f21292b`)
**Metodologia:** 5 agentes paralelos auditaram cada area do sistema independentemente

---

## Notas por Area Operacional

| # | Area | Nota | Status |
|---|------|------|--------|
| 1 | **Agendamento/Booking** | **7.5** | Core solido, gaps operacionais |
| 2 | **Catalogo de Servicos** | **8.0** | CRUD completo, dinamico |
| 3 | **Fidelidade/Loyalty** | **7.0** | Surpreendentemente completo, automacao ausente |
| 4 | **Admin/Dashboard** | **5.5** | Nucleo OK, falta gestao centralizada |
| 5 | **Financeiro/Pagamentos** | **2.0** | Zero gateway, so projecao de receita |
| 6 | **Notificacoes** | **6.0** | In-app funcional, sem email/SMS/push |
| 7 | **Auth & Seguranca** | **7.0** | Supabase + roles + CSRF + rate limit |
| 8 | **UX Cliente** | **8.2** | Chat booking inovador, SEO excelente |

### **Nota Geral: 6.4 / 10**

---

## Destaques Positivos

- **Advisory locks PostgreSQL** no booking — previne double-booking mesmo com requests paralelos
- **Fluxo de agendamento via chat** — diferenciador, mobile-first, amigavel
- **Guest booking** completo sem login, com token device-bound e claim posterior
- **Programa de fidelidade** surpreendentemente maduro: tiers, pontos, resgate, referral, aniversario
- **SEO tecnico excelente** — schema markup completo, sitemap dinamico, robots sofisticado
- **Validacao Zod** em todos endpoints, rate limiting, CSRF protection
- **Soft delete** em servicos e barbeiros preserva integridade historica
- **Dark/Light mode** com tokens semanticos bem pensados
- **i18n** 3 idiomas (pt-BR, es, en)
- **Feature flags** configuraveis em runtime no banco

---

## Pendencias Criticas (Operacional da Barbearia)

### P0 — Bloqueiam operacao real

| # | Item | Area | Impacto |
|---|------|------|---------|
| 1 | **Zero integracao de pagamento** (Stripe, Mercado Pago, Pix) | Financeiro | Sem tracking de receita real, sem recibos, sem split barbeiro/casa |
| 2 | **Sem cron jobs para loyalty** — pontos nunca expiram automaticamente, birthday bonus nunca dispara | Fidelidade | Programa de fidelidade nao funciona autonomamente |
| 3 | **Sem gestao de agendamentos pelo admin** — nenhuma visao consolidada, sem criar/cancelar/reagendar por qualquer barbeiro | Admin | Admin cego para operacao do dia |
| 4 | **Sem remarcacao (reschedule)** — FAQ promete, nao existe | Booking | Cliente cancela + cria novo, pode ser bloqueado pela janela de 2h |

### P1 — Muito necessarios

| # | Item | Area |
|---|------|------|
| 5 | **Sem email transacional** (confirmacao, cancelamento, lembrete) | Notificacoes |
| 6 | **Sem gestao de clientes pelo admin** (buscar, historico, exportar) | Admin |
| 7 | **Sem modelo de comissao** por barbeiro | Financeiro |
| 8 | **Sem gestao de BarberService pelo admin** (quais servicos cada barbeiro faz) | Admin |
| 9 | **Lembrete WhatsApp e manual** — barbeiro clica link, sem automacao 24h antes | Notificacoes |
| 10 | **Lead time diz "1 hora" mas sao 90 minutos** — mensagem inconsistente | Booking |

### P2 — Deveriam existir

| # | Item | Area |
|---|------|------|
| 11 | Sem limite de agendamentos simultaneos por cliente | Booking |
| 12 | Cliente pode agendar com 2 barbeiros no mesmo horario | Booking |
| 13 | Bug: no-show penaliza pontos mesmo com loyalty desativado | Fidelidade |
| 14 | Labels de tipo erradas no extrato de pontos do cliente | Fidelidade |
| 15 | Sem Service Worker — PWA sem suporte offline | UX |
| 16 | Sem logs de auditoria admin (quem fez o que) | Seguranca |
| 17 | Parametros de negocio hardcoded (lead time, janela cancelamento, configs loyalty) | Config |
| 18 | Sem relatorio de no-shows (receita perdida) | Financeiro |
| 19 | Sem relatorio de retencao (clientes inativos 30/60/90 dias) | Admin |
| 20 | Fechamento de ausencia nao cancela agendamentos automaticamente | Booking |

---

## Detalhamento por Area

### 1. Agendamento/Booking — 7.5/10

**Implementado:**
- Criacao de agendamentos (autenticado, guest, pelo barbeiro)
- Advisory lock `pg_advisory_xact_lock(hashtext(barberId), hashtext(date))` previne double-booking
- Verificacao de sobreposicao de intervalos com algoritmo correto `[A,B)` intersecta `[C,D)` se `A < D && C < B`
- Calculo de disponibilidade: shopHours, workingHours, shopClosures, absences carregados em paralelo
- Fallback de horarios do barbeiro para shopHours quando nao configurado
- Lead time 90min para clientes, sem restricao para barbeiros
- Cancelamento com janela de 2h, notificacao cruzada (cliente<->barbeiro)
- Cancelamento por guest via `X-Guest-Token`
- Ciclo completo: CONFIRMED -> COMPLETED / NO_SHOW / CANCELLED
- Feedback pos-atendimento (1 por agendamento, so COMPLETED)
- Guest linking (claim de agendamentos para conta registrada)
- CRUD de WorkingHours, BarberAbsence, ShopHours, ShopClosure
- Verificacao de conflito antes de criar ausencia (409 ABSENCE_CONFLICT)
- Lembrete com URL WhatsApp (manual pelo barbeiro)

**Faltando:**
- Remarcacao (reschedule) — FAQ promete mas nao existe
- Mensagem de lead time inconsistente (diz 1h, sao 90min): `useBooking.ts:23`, `route.ts:215`
- Sem limite de agendamentos simultaneos por cliente
- Cliente pode agendar com 2 barbeiros no mesmo horario (lock e por barbeiro, nao por cliente)
- Ausencia nao oferece cancelamento automatico dos agendamentos conflitantes
- Token de guest sobrescrito em novo booking (upsert sempre gera novo UUID)
- `getGuestAppointments` deprecated ainda no codigo
- `canCancelBeforeStart` deprecated ainda importada e usada
- Lembrete sem rate limiting por agendamento

**Arquivos-chave:**
- `src/services/booking.ts` (~2108 linhas) — servico central
- `src/lib/booking/` — 8 modulos de politica pura
- `src/lib/validations/booking.ts` — schemas Zod
- `src/app/api/appointments/` — route handlers

---

### 2. Catalogo de Servicos — 8.0/10

**Implementado:**
- CRUD completo protegido por `requireAdmin()`
- Dados dinamicos no modelo `Service` (name, slug, description, duration, price, active)
- Validacao Zod: nome 3-100 chars, duracao 15-180min multiplo de 15, preco R$0.01-R$10.000
- Slug automatico com resolucao de colisoes
- Soft delete (`active = false`) preserva historico de agendamentos
- CSRF via `requireValidOrigin()` em mutacoes

**Faltando:**
- Sem campo de imagem/foto no schema
- Sem ordenacao manual (campo `order`) — ordenacao por `active desc, name asc`
- Sem UI admin para associar barbeiro <-> servico (tabela `BarberService` existe, API nao)

**Arquivos-chave:**
- `src/app/api/admin/services/route.ts` e `[id]/route.ts`
- `src/lib/validations/service.ts`
- `src/app/[locale]/(protected)/admin/barbearia/servicos/ServicosPageClient.tsx`

---

### 3. Programa de Fidelidade — 7.0/10

**Implementado:**
- Schema completo: LoyaltyAccount, PointTransaction, Reward, Redemption
- Tiers BRONZE/SILVER/GOLD/DIAMOND com calculo e upgrade automatico
- 9 tipos de transacao com idempotencia via `@@unique([referenceId, type])`
- Servicos transacionais: creditPoints, debitPoints, penalizePoints (Prisma `$transaction`)
- Resgate de recompensas com verificacao de estoque e saldo
- Codigo de resgate com retry em colisao de UNIQUE
- Referral program: validacao, anti-auto-referencia, credito no primeiro agendamento completo
- Expiracao de pontos: logica completa em `expiration.service.ts`
- Birthday bonus: logica completa com idempotencia anual
- Notificacoes para todos eventos loyalty via `safeNotify`
- Integracao com booking: pontos em COMPLETED, penalidade em NO_SHOW
- APIs admin completas: accounts, adjust, rewards CRUD, redemptions, reports, expiring-points
- Config centralizada em `src/config/loyalty.config.ts`
- Testes unitarios abrangentes

**Faltando:**
- **Sem cron jobs** — `expire-points` e `birthday-bonuses` sao manuais
- **Bug:** `markAppointmentAsNoShow` nao verifica feature flag `loyaltyProgram` (penaliza com flag off)
- `EARNED_CHECKIN` omitido da lista `EXPIRABLE_TYPES` — 20pts de checkin nunca expiram
- Labels de tipo erradas na UI do extrato (`getTypeIcon` verifica tipos que nao existem no enum)
- `FIRST_APPOINTMENT_BONUS` (50pts) usado como bonus do indicado, mas UI mostra `REFERRAL_BONUS` (150pts)
- Historico sem paginacao na UI (API suporta, frontend nao expoe controles)
- `Reward.type` e String no schema (deveria ser enum Prisma)
- Auditoria admin via `console.info` sem persistencia estruturada
- Referral code collision: `generateReferralCode` sem retry em `P2002`
- Tier nunca faz downgrade (baseado em lifetimePoints)
- Todos os parametros hardcoded em codigo, nao configuraveis pelo admin

**Arquivos-chave:**
- `src/services/loyalty/` — 6 modulos de servico
- `src/config/loyalty.config.ts` — parametros de negocio
- `src/app/api/loyalty/` — APIs cliente
- `src/app/api/admin/loyalty/` — APIs admin
- `src/components/admin/loyalty/` — UI admin

---

### 4. Admin/Dashboard — 5.5/10

**Implementado:**
- Dashboard com AdminOverview (4 cards: agendamentos hoje, receita hoje, semana, barbeiros ativos)
- Gestao de barbeiros: CRUD completo com soft/hard delete inteligente
- Gestao de servicos: CRUD com soft delete
- Relatorio financeiro mensal: receita total/diaria, breakdown por servico, ticket medio, taxa de ocupacao, export PDF
- Gestao de avaliacoes: filtros multi-criterio, ranking de barbeiros
- Horarios da barbearia: ShopHours + ShopClosure
- Configuracoes gerais: nome, endereco, redes sociais, booking
- Feature flags em runtime
- Programa de fidelidade: gestao completa (accounts, rewards, redemptions, reports)
- Area barbeiro: faturamento individual, clientes, horarios, ausencias, cancelados, link personalizado

**Faltando:**
- **Sem gestao de agendamentos pelo admin** (visualizar, criar, cancelar, reagendar) — gap mais critico
- **Sem gestao de clientes pelo admin** (busca, historico, exportar, inativos)
- **Sem calendario consolidado** de todos os barbeiros
- Sem comparativo mes a mes no financeiro
- Sem modelo de comissao (split barbeiro/casa)
- Sem relatorio de no-shows
- Sem relatorio de retencao de clientes
- Sem estoque/produtos (nenhum modelo no schema)
- Sem promocoes/cupons (nenhum modelo no schema)
- Sem logs de auditoria
- Sem gestao de BarberService pelo admin
- Fechamentos nao tem opcao de edicao (so create/delete)

**Rotas admin existentes:**
- `/admin/faturamento`, `/admin/feedbacks`, `/admin/barbeiros`, `/admin/barbeiros/[id]/feedbacks`
- `/admin/barbeiros/[id]/horarios`, `/admin/barbearia/servicos`, `/admin/barbearia/horarios`
- `/admin/barbearia/configuracoes`, `/admin/barbearia/feature-flags`, `/admin/loyalty`

**Arquivos-chave:**
- `src/services/dashboard.ts` — stats central
- `src/app/api/admin/` — todas as rotas admin
- `src/components/dashboard/AdminOverview.tsx`
- `src/components/financial/FinancialPage.tsx`

---

### 5. Financeiro/Pagamentos — 2.0/10

**Implementado:**
- Dashboard de receita projetada (soma de precos de agendamentos COMPLETED/CONFIRMED)
- Receita diaria, breakdown por servico, ticket medio, taxa de ocupacao
- Export PDF via jsPDF + jspdf-autotable
- Filtro por barbeiro ou visao agregada
- Seletor dos ultimos 4 meses

**NAO existe:**
- Nenhum gateway de pagamento (Stripe, Mercado Pago, Pagarme, Pix integrado)
- Nenhum modelo `Payment`, `Transaction`, `Invoice` no schema
- Nenhum campo `paymentMethod` ou `paymentStatus` em `Appointment`
- Sem tracking de metodo (dinheiro, cartao, pix)
- Sem recibos digitais
- Sem estornos
- Sem split de comissao barbeiro/casa
- Sem export CSV/Excel

**Conclusao:** Sistema assume pagamento presencial nao rastreado. "Financeiro" e puramente baseado em preco do servico x agendamentos concluidos.

**Arquivos-chave:**
- `src/app/api/admin/financial/route.ts`
- `src/lib/pdf/financial-report.ts`

---

### 6. Notificacoes — 6.0/10

**Implementado:**
- Sistema de notificacoes in-app (banco de dados)
- Modelo `Notification` com 9 tipos (appointment + loyalty)
- Disparo em: criacao de agendamento, cancelamento, loyalty events
- Cancelamento: notificacao cruzada (barbeiro<->cliente registrado)
- Lembrete: notificacao in-app + URL WhatsApp (manual pelo barbeiro)
- Frontend: NotificationBell com badge, NotificationPanel (sheet lateral), toast via sonner
- API: GET paginado, mark read, mark all read, rate limited

**NAO existe:**
- Nenhum email transacional (confirmacao, cancelamento, lembrete)
- Nenhum SMS/WhatsApp automatico (lembrete e link manual)
- Nenhuma push notification (browser/mobile)
- Clientes guest nao recebem notificacao nenhuma (sem conta)
- Lembretes nao sao automaticos (sem cron 24h antes)
- Sem SSE/WebSocket real-time (so chega se pagina aberta)
- Sem interface admin para envio de notificacoes manuais para segmentos

**Arquivos-chave:**
- `src/services/notification.ts`
- `src/services/loyalty/notification.service.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/appointments/[id]/reminder/route.ts`
- `src/components/notifications/`

---

### 7. Auth & Seguranca — 7.0/10

**Implementado:**
- Supabase Auth (email/senha + Google OAuth)
- Signup, login, recuperacao de senha, reenvio de confirmacao, troca de senha
- 3 roles: CLIENT, BARBER, ADMIN
- `requireAdmin()` e `requireBarber()` com discriminated union tipada
- CSRF via `requireValidOrigin()` em mutacoes
- Rate limiting com Upstash Redis (fallback in-memory): 10/min agendamentos, 5/min guest, 100/min geral, 3/min sensivel
- Sistema de ban: BannedClient por profileId ou guestClientId, telefone de guest banido bloqueia novo cadastro
- Guest access token para consulta de agendamentos

**Faltando:**
- Sem middleware global na raiz — cada route handler protege a si mesmo
- Inconsistencia: `Profile.role = BARBER` vs existencia de registro na tabela `Barber` (podem divergir)
- Sem 2FA
- Sem log de auditoria de acoes administrativas
- `maximumScale: 1` no viewport prejudica acessibilidade (impede zoom)

**Arquivos-chave:**
- `src/lib/auth/requireAdmin.ts` e `requireBarber.ts`
- `src/services/auth.ts`
- `src/lib/rate-limit.ts`
- `src/lib/api/verify-origin.ts`

---

### 8. UX Cliente — 8.2/10

**Implementado:**
- Home completa: Hero, Services, Team, Testimonials, Instagram, Events (flag), Contact, Sponsors, Gallery, FAQ
- Agendamento via chat conversacional (ChatContainer) — inovador e mobile-first
- Suporte a pre-selecao via query param (`?barbeiro=<id>`)
- Perfil completo: dados pessoais, seguranca, LGPD, export JSON, delete account
- Historico de agendamentos: proximos + passados, cancelamento, feedback, import guest
- Guest lookup de agendamentos
- Dark/Light mode com tokens semanticos
- PWA manifest com shortcuts (agendar, servicos, instagram)
- SEO: schema markup (LocalBusiness, Service, FAQ, Organization, BreadcrumbList), sitemap dinamico, robots sofisticado
- Google Analytics + GTM
- i18n 3 idiomas com LanguageSwitcher
- BottomNav mobile com safe-area-inset-bottom
- Touch targets 44x44px
- Loading states com skeletons e TypingIndicator
- Error states com retry
- Empty states com CTA
- Acessibilidade: sr-only, aria-label, aria-current, autoComplete

**Faltando:**
- Sem pagina `/sobre` standalone
- Sem confirmacao por email/WhatsApp apos agendamento
- Sem Service Worker (sem offline)
- `maximumScale: 1` impede zoom para baixa visao
- Reviews hardcoded no schema markup (risco Google)
- Screenshots PWA usam logo ao inves de capturas reais
- Blog estatico sem CMS
- Sem skip-navigation link
- Formularios de auth misturam inputs nativos e componente UI

**Arquivos-chave:**
- `src/app/[locale]/(public)/page.tsx` — home
- `src/app/[locale]/agendar/AgendarPageClient.tsx` — booking
- `src/components/booking/chat/` — chat components
- `src/app/[locale]/meus-agendamentos/` — historico
- `src/app/[locale]/(protected)/profile/page.tsx` — perfil
- `src/components/seo/SchemaMarkup.tsx` — SEO
- `src/app/manifest.ts` — PWA

---

## O que NAO existe e uma barbearia real precisaria

| Funcionalidade | Modelo no DB? | API? | UI? |
|----------------|---------------|------|-----|
| Pagamentos / gateway | Nenhum | Nenhuma | Nenhuma |
| Estoque / produtos | Nenhum | Nenhuma | Nenhuma |
| Promocoes / cupons | Nenhum | Nenhuma | Nenhuma |
| Comissao barbeiro | Nenhum | Nenhuma | Nenhuma |
| Calendario admin consolidado | — | Nenhuma | Nenhuma |
| Email transacional | — | Nenhuma | — |
| SMS/Push automatico | — | Nenhum | — |
| 2FA | — | Nenhum | Nenhuma |
| Pagina /sobre | — | — | Nenhuma |
| Remarcacao de agendamento | — | Nenhuma | Nenhuma |
| Gestao de clientes (admin) | — | Nenhuma | Nenhuma |
| Gestao de agendamentos (admin) | — | Nenhuma | Nenhuma |
| Logs de auditoria | Nenhum | Nenhum | Nenhuma |

---

## Resumo Visual

```
Agendamento    [########__] 7.5  — core forte, falta reschedule e visao admin
Servicos       [########__] 8.0  — CRUD completo, falta imagem e ordenacao
Fidelidade     [#######___] 7.0  — logica madura, automacao zero
Admin          [#####_____] 5.5  — opera sem visao centralizada
Pagamentos     [##________] 2.0  — inexistente
Notificacoes   [######____] 6.0  — in-app OK, canais externos zero
Auth           [#######___] 7.0  — solido, falta middleware global
UX Cliente     [########__] 8.2  — chat booking excelente, SEO top

GERAL          [######____] 6.4
```

**Veredicto:** Core tecnico bem construido — advisory locks, validacao, arquitetura em camadas, testes. O que falta e **operacional**: pagamentos, notificacoes externas, visao admin centralizada e automacoes. Sistema funciona como MVP de agendamento com fidelidade, mas precisa de mais camadas para operacao real completa de barbearia.
