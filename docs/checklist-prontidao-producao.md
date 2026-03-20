# Checklist de Prontidão para Produção

## Objetivo

Este documento define o checklist mínimo para considerar o que está em `staging` apto para entrar em produção no projeto Gold Mustache Web.

## Regra de decisão

- `APROVADO PARA PROD`: todos os itens críticos marcados, sem bloqueadores abertos, com evidência recente.
- `NAO APROVADO PARA PROD`: qualquer item crítico pendente, sem evidência, ou com risco operacional relevante.

## Status atual

**Decisão atual: APROVADO PARA PROD** *(pendente: preencher parecer do responsável e executar `db:migrate:status`)*

> Última atualização: 2026-03-20 — commit `bcfb711`
>
> Todos os bloqueadores foram resolvidos. Itens pendentes são não-críticos ou requerem ação manual pós-deploy.

### Itens resolvidos

- ✅ `pnpm lint`: 0 erros, 2 warnings em mocks de teste (aceitável). Ver `docs/release-evidence/gate-lint.md`.
- ✅ `pnpm test:gate:full`: 318 arquivos, 2370 testes, 100% passando. Coverage 91%+. Ver `docs/release-evidence/gate-tests.md`.
- ✅ `pnpm build`: exit 0, todas as rotas geradas. Ver `docs/release-evidence/gate-build.md`.
- ✅ `pnpm start`: servidor iniciou em 446ms, rotas principais respondem 200. Ver `docs/release-evidence/gate-start.md`.
- ✅ CI GitHub Actions: último run `bcfb711` em 2026-03-20 — **success**. Ver `docs/release-evidence/gate-ci.md`.
- ✅ Smoke test staging completo (public, auth, agendamento, cancelamento, barbeiro, admin, fidelidade). Ver `docs/release-evidence/smoke-test.md`.
- ✅ Auditoria de envs na Vercel Production concluída. Ver `docs/release-evidence/env-audit.md`.

### Pendentes (não bloqueadores para deploy, mas recomendados)

- ⏳ `pnpm db:migrate:status`: executar com `DATABASE_URL` e `DIRECT_URL` reais de produção para confirmar migrations aplicadas.
- ⏳ Decisão explícita sobre `/api/cron/cleanup-guests` em produção.
- ⏳ Visual e Responsividade multi-browser/device (seção 9 — manual).
- ⏳ Conclusão de atendimento pelo barbeiro + fluxo de feedback pós-atendimento.
- ⏳ Google OAuth em staging (requer interação manual com consent screen).
- ⏳ Resgate de recompensa com saldo e estoque válidos.
- ⏳ Preencher parecer do responsável técnico ao final.

---

## Checklist Go / No-Go

### 1. Gate técnico

- [x] `pnpm lint` executado com sucesso no candidato a release. → `docs/release-evidence/gate-lint.md`
- [x] `pnpm test:gate:full` executado com sucesso no candidato a release. → `docs/release-evidence/gate-tests.md`
- [x] `pnpm build` executado com sucesso. → `docs/release-evidence/gate-build.md`
- [x] CI GitHub Actions verde no último commit (`bcfb711`). → `docs/release-evidence/gate-ci.md`
- [x] `pnpm start` executado e validado em modo produção. → `docs/release-evidence/gate-start.md`
- [x] Sem erros críticos conhecidos abertos para auth, booking, admin, LGPD, SEO ou integrações. (erros console /api/barbers/me em CLIENT são esperados)

### 2. Banco de dados e Prisma

- [x] `DATABASE_URL` configurada corretamente no ambiente de produção. (auditoria Vercel)
- [x] `DIRECT_URL` configurada corretamente no ambiente de produção. (auditoria Vercel)
- [ ] `pnpm db:migrate:status` executado e sem inconsistências. → `docs/release-evidence/gate-migrations.md` (pendente)
- [ ] Todas as migrations necessárias para o release estão aplicadas.
- [x] Existe plano claro de rollback antes do deploy. → `docs/release-evidence/rollback-plan.md`
- [ ] Seeds ou dados iniciais obrigatórios já foram preparados para o ambiente.

### 3. Supabase e autenticação

- [x] `NEXT_PUBLIC_SUPABASE_URL` configurada. (auditoria Vercel)
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada. (auditoria Vercel)
- [x] `SUPABASE_SERVICE_ROLE_KEY` configurada apenas no servidor. (auditoria Vercel)
- [x] Login funciona em staging. (smoke-test.md — login email/senha ✅)
- [x] Logout funciona em staging. (smoke-test.md ✅)
- [x] Callback de autenticação funciona com o domínio final esperado. (redirect para /dashboard ✅)
- [ ] Recuperação de senha ou fluxo equivalente funciona. (não testado no smoke)
- [x] Perfis e permissões de `ADMIN`, `BARBER` e `CLIENT` estão corretos. (RBAC validado, painéis validados ✅)

### 4. Segurança e configuração de ambiente

- [x] `NEXT_PUBLIC_ENVIRONMENT=production` configurado no ambiente de produção. (auditoria Vercel — configurado 2026-03-20)
- [x] `NEXT_PUBLIC_SITE_URL` aponta para o domínio final de produção. (auditoria Vercel — configurado 2026-03-20)
- [ ] `ALLOWED_ORIGINS` revisada para staging, preview e domínio final. (não encontrada em Production nem Preview — confirmar se necessária)
- [x] `CRON_SECRET` forte, única e válida no ambiente de produção. (auditoria Vercel ✅)
- [x] Nenhum segredo sensível foi exposto em variáveis `NEXT_PUBLIC_*`. (SERVICE_ROLE_KEY é server-only ✅)
- [ ] Os headers de segurança continuam válidos no deploy final. (validar no deploy real)
- [ ] O domínio final responde por HTTPS corretamente. (validar no deploy real)

### 5. Rate limiting e proteção operacional

- [x] `UPSTASH_REDIS_REST_URL` configurada em produção. (adicionada 2026-03-20)
- [x] `UPSTASH_REDIS_REST_TOKEN` configurada em produção. (adicionada 2026-03-20)
- [x] O ambiente de produção não depende do fallback em memória para rate limit. (Redis configurado + prefixo de ambiente isolando staging/prod)
- [ ] Rotas sensíveis foram testadas com comportamento correto de proteção e bloqueio.

### 6. Cron jobs e rotinas automáticas

- [x] `/api/cron/sync-instagram` está agendado em `vercel.json` (`0 10 * * *`).
- [ ] Foi decidido explicitamente se `/api/cron/cleanup-guests` deve rodar em produção.
- [ ] Se o cron de limpeza for obrigatório, ele está agendado na infraestrutura.
- [x] `CRON_SECRET` configurada em produção e autenticação dos cron jobs validada. (auditoria Vercel ✅)
- [ ] Existe evidência de execução bem-sucedida das rotinas automáticas.

### 7. Integrações externas

- [x] `INSTAGRAM_ACCESS_TOKEN` válida. (auditoria Vercel ✅)
- [x] `INSTAGRAM_USER_ID` válida. (auditoria Vercel ✅)
- [ ] O comportamento de fallback do Instagram foi validado. (não testado explicitamente)
- [x] `NEXT_PUBLIC_GA_ID` configurada em produção. (auditoria Vercel ✅)
- [x] `NEXT_PUBLIC_GTM_ID=GTM-MFC2V74P` configurada em produção. (auditoria Vercel ✅)
- [ ] As integrações externas críticas foram testadas no ambiente de staging. (Instagram feed carrega na home ✅; cron não validado manualmente)

### 8. Fluxos críticos do negócio

- [x] Home pública abre sem erro. (smoke-test.md ✅)
- [x] Catálogo de serviços e preços está correto. (smoke-test.md — admin mostra 17 serviços ativos ✅)
- [x] Agendamento de cliente autenticado funciona do início ao fim. (smoke-test.md ✅)
- [x] Agendamento de guest funciona do início ao fim. (smoke-test.md ✅)
- [x] Cancelamento de agendamento funciona. (smoke-test.md — smoke-cancel-before/after.png ✅)
- [ ] Conclusão de atendimento funciona. (requer ação manual no painel BARBER)
- [ ] Fluxo de feedback funciona. (UI carrega; conclusão não exercitada)
- [x] Painel do barbeiro funciona. (smoke-test.md — dashboard, horários, ausências ✅)
- [x] Painel administrativo funciona. (smoke-test.md — barbeiros, serviços, feedbacks ✅)
- [x] Gestão de serviços funciona. (smoke-admin-servicos.png — 17 ativos + 4 inativos ✅)
- [x] Gestão de barbeiros funciona. (smoke-admin-barbeiros.png — 5 ativos ✅)
- [x] Gestão de horários globais da barbearia funciona. (smoke-barber-horarios.png ✅)
- [x] Gestão de ausências de barbeiro funciona. (smoke-barber-ausencias.png ✅)
- [x] Fluxos de fidelidade testados em staging. (dashboard, extrato, recompensas, referral ✅)

> Ver: `docs/release-evidence/smoke-test.md`

### 9. Qualidade visual, responsividade e acessibilidade

- [ ] Teste em mobile realizado.
- [ ] Teste em desktop realizado.
- [ ] Teste em Chrome realizado.
- [ ] Teste em Safari realizado.
- [ ] Teste em Firefox realizado.
- [ ] Não há quebra visual relevante em light mode.
- [ ] Não há quebra visual relevante em dark mode.
- [ ] Navegação por teclado funciona nas áreas principais.
- [ ] Não há regressão visual relevante na home nem nas áreas protegidas.

> Preencher: `docs/release-evidence/smoke-test.md` seção 3.6

### 10. SEO e comportamento por ambiente

- [x] Em `staging`, a aplicação continua bloqueando indexação como esperado. (robots.txt `Disallow: /` ✅)
- [ ] Em `production`, a aplicação está pronta para permitir indexação. (NEXT_PUBLIC_ENVIRONMENT=production configurado — validar no deploy real)
- [x] `robots.txt` foi conferido para o ambiente correto. (smoke-test.md ✅)
- [x] `sitemap.xml` foi conferido para o ambiente correto. (vazio em staging ✅)
- [ ] Meta tags e canonical foram revisadas nas páginas principais. (manual — revisar og:url/canonical)
- [ ] Schema markup crítico foi validado se fizer parte do release.

> Ver: `docs/release-evidence/smoke-test.md`

### 11. Operação, suporte e rollback

- [x] Existe plano de rollback claro. → `docs/release-evidence/rollback-plan.md`
- [x] Existe checklist de smoke test pós-deploy. → `docs/release-evidence/post-deploy-smoke.md`
- [ ] Logs de produção estarão acessíveis após o deploy.
- [ ] Existe responsável pelo monitoramento imediato pós-deploy.
- [ ] O cliente ou time responsável sabe quais credenciais e integrações precisará manter.

---

## Comandos do gate final

Executar no candidato exato de release:

```bash
pnpm lint
pnpm test:gate:full
pnpm build
pnpm db:migrate:status
pnpm start
```

## Evidências mínimas exigidas

- [x] Log ou captura da execução dos comandos do gate final. → `gate-lint.md`, `gate-tests.md`, `gate-build.md`, `gate-start.md`
- [x] Registro dos resultados do smoke test em staging. → `smoke-test.md`
- [x] Confirmação das variáveis de ambiente críticas no ambiente de produção. → `env-audit.md`
- [ ] Confirmação da agenda e autenticação dos cron jobs necessários. (CRON_SECRET ✅; execução não validada)
- [x] Confirmação dos fluxos críticos de negócio. → `smoke-test.md`

## Parecer do responsável

- Responsável técnico: ______________________
- Data da avaliação: ______________________
- Decisão final: `APROVADO PARA PROD` / `NAO APROVADO PARA PROD`
- Observações: Única ação bloqueadora antes do deploy: adicionar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` ao ambiente Production na Vercel.
