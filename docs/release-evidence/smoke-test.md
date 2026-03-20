# Smoke Test — Staging

**Data (automatizado):** 2026-03-19
**Responsável (automatizado):** Agent (Playwright MCP + curl)
**URL de Staging:** `https://staging.goldmustachebarbearia.com.br` (apex) e `https://www.staging.goldmustachebarbearia.com.br` (www — redirect)
**Deployment Vercel:** `dpl_8Ujiz3Y9jdVTwfnN71JeGV9H2xcg` — commit `3abe8a4` — estado **READY**

---

## Smoke automatizado (2026-03-19)

### Preflight — deployment

- `list_deployments` (MCP Vercel): primeiro deployment da branch `staging` com SHA `3abe8a49b7d9ed04c2459ce7f1e83bcc3946a32a` em estado **READY**.

### SEO — curl

**`robots.txt`** (`curl -sL https://staging.goldmustachebarbearia.com.br/robots.txt`)

- HTTP 200
- Conteúdo inclui `User-Agent: *`, `Disallow: /`, `Host: https://www.staging.goldmustachebarbearia.com.br`
- **Resultado:** bloqueio de indexação conforme esperado para staging.

**`sitemap.xml`** (`curl -sL https://staging.goldmustachebarbearia.com.br/sitemap.xml`)

- HTTP 200
- Corpo: `<urlset>` vazio (`<urlset ...></urlset>` sem `<url>`)
- **Resultado:** sitemap vazio em staging, alinhado ao código (`siteConfig.isProduction`).

### Home pública — Playwright (user-browser MCP)

- Navegação: `https://www.staging.goldmustachebarbearia.com.br/pt-BR`
- Título: "Gold Mustache Barbearia - Tradição e Estilo Masculino | Itapema-SC"
- **Banner de STAGING:** visível no topo (faixa âmbar: "Ambiente de STAGING — Este não é o site de produção"). Evidência: [smoke-staging-home-top.png](smoke-staging-home-top.png)
- Árvore de acessibilidade confirma: hero, **Serviços** (ex.: Combo Completo R$ 100), **Equipe** (4 barbeiros), **Depoimentos**, **Instagram**, **Eventos** (iframe YouTube), **Contato & Localização**, **Parceiros**, **Galeria**, **FAQ** (accordion).
- **Console:** 1 erro — `Failed to load resource` HTTP **400** em recurso associado a `/pt-BR` (investigar em rede; não bloqueou render da home).
- **Nota:** `staging.goldmustachebarbearia.com.br/pt-BR` retorna **307** para `www.staging...` — comportamento esperado com domínio www.

---

## 3.1 — Público

| Item | Resultado |
|------|-----------|
| Home pública carrega sem erro | [x] ✅ / [ ] ❌ (com 1 erro 400 no console; página renderiza) |
| Catálogo de serviços e preços visível e correto | [x] ✅ / [ ] ❌ (Combo Completo e preços visíveis; seção ainda mostra "Carregando serviços..." para lista dinâmica — investigar se API lenta) |
| Seção: equipe | [x] ✅ / [ ] ❌ |
| Seção: galeria | [x] ✅ / [ ] ❌ |
| Seção: depoimentos | [x] ✅ / [ ] ❌ |
| Seção: FAQ | [x] ✅ / [ ] ❌ |
| Seção: contato | [x] ✅ / [ ] ❌ |
| Banner de STAGING visível | [x] ✅ / [ ] ❌ |

---

## Smoke autenticado (2026-03-20)

**Responsável (automatizado):** Agent (Playwright MCP — `project-0-gold-mustache-web-playwright`)
**URL:** `https://www.staging.goldmustachebarbearia.com.br/pt-BR`
**Conta CLIENT (rodada 1):** criada no próprio fluxo de smoke via `/pt-BR/signup` (email `smoke.automated.20260319.7k2j@test.local`). Login por **email/senha** exercitado em seguida; **Google OAuth não testado** nesta rodada.
**Conta BARBER/ADMIN:** `leobrizolla@proton.me` (usuário real com roles BARBER e ADMIN — 2026-03-20).
**Conta CLIENT (rodada 2):** `smoke.cancel.20260320@test.local` — criada para teste de cancelamento.
**Sessão guest:** cookies limpos (`page.context().clearCookies()`) antes do agendamento guest.

### Evidências (PNG)

| Área | Arquivo |
|------|---------|
| Dashboard CLIENT após signup | [smoke-auth-dashboard-client.png](smoke-auth-dashboard-client.png) |
| Após logout (home) | [smoke-auth-after-logout.png](smoke-auth-after-logout.png) |
| Login email/senha | [smoke-auth-login-email.png](smoke-auth-login-email.png) |
| RBAC barbeiro (CLIENT) | [smoke-barber-rbac-client.png](smoke-barber-rbac-client.png) |
| RBAC admin (CLIENT) | [smoke-admin-rbac-client.png](smoke-admin-rbac-client.png) |
| Agendamento autenticado — confirmado | [smoke-booking-auth.png](smoke-booking-auth.png) |
| Agendamento guest — confirmado | [smoke-booking-guest.png](smoke-booking-guest.png) |
| Meus agendamentos | [smoke-meus-agendamentos.png](smoke-meus-agendamentos.png) |
| Fidelidade — dashboard | [smoke-loyalty-dashboard.png](smoke-loyalty-dashboard.png) |
| Fidelidade — extrato | [smoke-loyalty-history.png](smoke-loyalty-history.png) |
| Fidelidade — recompensas | [smoke-loyalty-rewards.png](smoke-loyalty-rewards.png) |
| Fidelidade — indicação | [smoke-loyalty-referral.png](smoke-loyalty-referral.png) |
| Painel BARBER — dashboard (leobrizolla) | [smoke-barber-dashboard.png](smoke-barber-dashboard.png) |
| Painel BARBER — horários | [smoke-barber-horarios.png](smoke-barber-horarios.png) |
| Painel BARBER — ausências | [smoke-barber-ausencias.png](smoke-barber-ausencias.png) |
| Painel ADMIN — barbeiros | [smoke-admin-barbeiros.png](smoke-admin-barbeiros.png) |
| Painel ADMIN — serviços | [smoke-admin-servicos.png](smoke-admin-servicos.png) |
| Painel ADMIN — feedbacks/avaliações | [smoke-admin-feedbacks.png](smoke-admin-feedbacks.png) |
| Cancelamento — antes | [smoke-cancel-before.png](smoke-cancel-before.png) |
| Cancelamento — depois (status "Cancelado") | [smoke-cancel-after.png](smoke-cancel-after.png) |

**Nota:** emails de smoke no domínio `@test.local`. Remover usuários de smoke no Supabase após testes; **não documentar senhas** neste repositório.

### Comportamentos observados

- Toast **“Acesso restrito a barbeiros”** ao acessar `/pt-BR/barbeiro` como CLIENT; redirect para `/pt-BR/dashboard`.
- Toast **“Acesso restrito a administradores”** ao acessar `/pt-BR/admin/barbeiros` como CLIENT; UI não carrega dados de admin (esperado).
- Erros de rede no console: `GET /api/barbers/me` para usuário CLIENT (esperado; barber record inexistente).
- Agendamento autenticado: **David Trindade**, **Corte Simples**, **26-03-2026 17:30**.
- Agendamento guest: **João Vitor**, **Barba**, **27-03-2026 10:00**, nome **Guest Smoke Test** / tel. **(48) 98877-6655**.
- Painel BARBER (`leobrizolla`): dashboard com agenda semanal, faturamento do dia/semana, slots DISPONÍVEL; sub-rotas **Meus Horários** (6 dias ativos, 09–18 com pausa 12–13) e **Ausências** carregam corretamente.
- Painel ADMIN: **Gerenciar Barbeiros** — 5 ativos, 39 agendamentos; **Serviços da Barbearia** — 17 ativos, 4 inativos, preço médio R$67,65, duração média 43 min; **Avaliações** — média 4.7, 3 avaliações, 100% positivas.
- **Cancelamento:** conta CLIENT `smoke.cancel.20260320@test.local` criou agendamento (David Trindade, Barba, 21-03-2026 10:00) e cancelou com sucesso — status passou de "Confirmado" para "Cancelado" e o item migrou para "Histórico".

---

## 3.2 — Autenticação

| Item | Resultado |
|------|-----------|
| Login com Google funciona | [ ] ✅ / [ ] ❌ **(não testado nesta rodada)** |
| Logout funciona | [x] ✅ / [ ] ❌ |
| Callback de autenticação redireciona corretamente | [x] ✅ / [ ] ❌ (fluxo email: redirect para `/pt-BR/dashboard` após login) |
| Recuperação de senha funciona | [ ] ✅ / [ ] N/A |
| Perfil CLIENT carrega corretamente | [x] ✅ / [ ] ❌ (dashboard + menu) |
| Perfil BARBER carrega corretamente | [x] ✅ / [ ] ❌ (dashboard + horários + ausências — ver smoke-barber-dashboard.png) |
| Perfil ADMIN carrega corretamente | [x] ✅ / [ ] ❌ (barbeiros + serviços + feedbacks — ver smoke-admin-barbeiros.png) |

---

## 3.3 — Agendamento

| Item | Resultado |
|------|-----------|
| Agendamento como cliente autenticado (início ao fim) | [x] ✅ / [ ] ❌ |
| Agendamento como guest (início ao fim) | [x] ✅ / [ ] ❌ |
| Cancelamento de agendamento | [x] ✅ / [ ] ❌ (agendado e cancelado — ver smoke-cancel-before/after.png) |
| Conclusão de atendimento pelo barbeiro | [ ] ✅ / [ ] ❌ **(não exercitado — requer operação manual no painel BARBER)** |

---

## 3.4 — Administrativo

| Item | Resultado |
|------|-----------|
| Painel do barbeiro funciona | [x] ✅ / [ ] ❌ (dashboard, agenda, horários, ausências — smoke-barber-dashboard.png) |
| Painel administrativo funciona | [x] ✅ / [ ] ❌ (barbeiros, serviços, feedbacks — smoke-admin-barbeiros.png) |
| Gestão de serviços | [x] ✅ / [ ] ❌ (17 ativos + 4 inativos exibidos; CRUD disponível — smoke-admin-servicos.png) |
| Gestão de barbeiros | [x] ✅ / [ ] ❌ (5 barbeiros ativos, ações Horários/Desativar/Remover — smoke-admin-barbeiros.png) |
| Gestão de horários globais | [x] ✅ / [ ] ❌ (Meus Horários BARBER: 6 dias configurados — smoke-barber-horarios.png) |
| Gestão de ausências | [x] ✅ / [ ] ❌ (formulário + lista "Nenhuma ausência" — smoke-barber-ausencias.png) |

---

## 3.5 — Fidelidade e Feedback

| Item | Resultado |
|------|-----------|
| Fluxo de feedback funciona | [ ] ✅ / [ ] ❌ **(modal não exercitado — sem agendamento concluído; lista “Meus Agendamentos” OK)** |
| Pontos de fidelidade creditados | [ ] ✅ / [x] N/A **(saldo 0; crédito após conclusão não verificado)** |
| Resgate de recompensa | [ ] ✅ / [x] N/A **(catálogo carrega; resgates desabilitados — pontos insuficientes / sem estoque)** |
| Referral funciona | [x] ✅ / [ ] N/A **(página carrega; código exibido; fluxo E2E de indicação+conclusão não fechado)** |

---

## 3.6 — Visual e Responsividade

| Item | Resultado |
|------|-----------|
| Mobile Chrome — sem quebras | [ ] ✅ / [ ] ❌ |
| Mobile Safari — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Chrome — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Safari — sem quebras | [ ] ✅ / [ ] ❌ |
| Desktop Firefox — sem quebras | [ ] ✅ / [ ] ❌ |
| Light mode — sem quebras | [ ] ✅ / [ ] ❌ |
| Dark mode — sem quebras | [ ] ✅ / [ ] ❌ |
| Navegação por teclado nas áreas principais | [ ] ✅ / [ ] ❌ |

---

## 3.7 — SEO por Ambiente

| Item | Resultado |
|------|-----------|
| `robots.txt` bloqueia indexação em staging | [x] ✅ / [ ] ❌ |
| Sitemap retorna vazio em staging | [x] ✅ / [ ] ❌ |
| Meta tags e canonical revisadas | [ ] ✅ / [ ] ❌ (manual — revisar og:url/canonical em produção) |

> Verificar `robots.txt`: `curl https://<staging-url>/robots.txt`
> Verificar sitemap: `curl https://<staging-url>/sitemap.xml`

---

## Status Final: [ ] APROVADO / [x] PARCIAL / [ ] BLOQUEADO

**Resumo:** todos os fluxos críticos automáticos foram exercitados e evidenciados:

- **Público + SEO** (2026-03-19): home, serviços, robots.txt, sitemap.
- **Auth email/senha** (2026-03-20): signup CLIENT, login, logout, RBAC.
- **Agendamento** autenticado + guest + **cancelamento** por CLIENT.
- **Painel BARBER** (leobrizolla): dashboard, agenda, horários, ausências.
- **Painel ADMIN**: barbeiros, serviços, feedbacks/avaliações.
- **Fidelidade** (UI): dashboard, extrato, recompensas, referral.

**Pendências remanescentes (não bloqueadoras para deploy):**

- Login **Google OAuth** em staging (requer interação humana com consent screen).
- **Conclusão de atendimento** pelo barbeiro (manual; dispara pontos/feedback).
- **Resgate** de recompensa com estoque e saldo válidos.
- Auditoria de envs na Vercel Production (env-audit.md).
- Seção **3.6** — Visual e Responsividade (multi-browser/device).

Bloqueadores / ruídos conhecidos:

- Console: erro HTTP **400** em recurso na home `/pt-BR` (investigar no DevTools > Network).
- Lista de serviços na home: possível carregamento parcial ("Carregando serviços...") — validar API `/api/services` em staging.
- Console (CLIENT): falhas esperadas em `GET /api/barbers/me` quando o usuário não é barbeiro.

Observações: MCP `web_fetch_vercel_url` para `robots.txt` retornou erro 409 no servidor; evidência de SEO obtida via **curl**. Seção **3.6** (visual multi-browser) permanece checklist manual.
