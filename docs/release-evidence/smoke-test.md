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

## 3.2 — Autenticação

| Item | Resultado |
|------|-----------|
| Login com Google funciona | [ ] ✅ / [ ] ❌ |
| Logout funciona | [ ] ✅ / [ ] ❌ |
| Callback de autenticação redireciona corretamente | [ ] ✅ / [ ] ❌ |
| Recuperação de senha funciona | [ ] ✅ / [ ] N/A |
| Perfil CLIENT carrega corretamente | [ ] ✅ / [ ] ❌ |
| Perfil BARBER carrega corretamente | [ ] ✅ / [ ] ❌ |
| Perfil ADMIN carrega corretamente | [ ] ✅ / [ ] ❌ |

---

## 3.3 — Agendamento

| Item | Resultado |
|------|-----------|
| Agendamento como cliente autenticado (início ao fim) | [ ] ✅ / [ ] ❌ |
| Agendamento como guest (início ao fim) | [ ] ✅ / [ ] ❌ |
| Cancelamento de agendamento | [ ] ✅ / [ ] ❌ |
| Conclusão de atendimento pelo barbeiro | [ ] ✅ / [ ] ❌ |

---

## 3.4 — Administrativo

| Item | Resultado |
|------|-----------|
| Painel do barbeiro funciona | [ ] ✅ / [ ] ❌ |
| Painel administrativo funciona | [ ] ✅ / [ ] ❌ |
| Gestão de serviços | [ ] ✅ / [ ] ❌ |
| Gestão de barbeiros | [ ] ✅ / [ ] ❌ |
| Gestão de horários globais | [ ] ✅ / [ ] ❌ |
| Gestão de ausências | [ ] ✅ / [ ] ❌ |

---

## 3.5 — Fidelidade e Feedback

| Item | Resultado |
|------|-----------|
| Fluxo de feedback funciona | [ ] ✅ / [ ] ❌ |
| Pontos de fidelidade creditados | [ ] ✅ / [ ] N/A |
| Resgate de recompensa | [ ] ✅ / [ ] N/A |
| Referral funciona | [ ] ✅ / [ ] N/A |

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

## Status Final: [ ] APROVADO / [ ] BLOQUEADO

**Automatizado:** apenas fluxo público + SEO; **não** cobre auth, agendamento E2E, admin.

Bloqueadores encontrados:

- Console: erro HTTP 400 em recurso na home `/pt-BR` (investigar no DevTools > Network).
- Lista de serviços: possível carregamento parcial ("Carregando serviços...") — validar API `/api/services` em staging.

Observações: Completar seções 3.2–3.6 manualmente com credenciais. MCP `web_fetch_vercel_url` para `robots.txt` retornou erro 409 no servidor; evidência de SEO obtida via **curl**.
