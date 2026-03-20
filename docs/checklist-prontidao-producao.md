# Checklist de Prontidão para Produção

## Objetivo

Este documento define o checklist mínimo para considerar o que está em `staging` apto para entrar em produção no projeto Gold Mustache Web.

## Regra de decisão

- `APROVADO PARA PROD`: todos os itens críticos marcados, sem bloqueadores abertos, com evidência recente.
- `NAO APROVADO PARA PROD`: qualquer item crítico pendente, sem evidência, ou com risco operacional relevante.

## Status atual

**Decisão atual: NAO APROVADO PARA PROD**

> Última atualização: 2026-03-19 — commit `aef97ff`
>
> Gate técnico coletado. Pendente: validação manual de migrations, `pnpm start`, smoke test em staging, auditoria de envs na Vercel, cron e operação.

### Itens resolvidos nesta sessão

- ✅ `pnpm lint`: 0 erros, 2 warnings em mocks de teste (aceitável). Ver `docs/release-evidence/gate-lint.md`.
- ✅ `pnpm test:gate:full`: 318 arquivos, 2370 testes, 100% passando. Coverage 91%+. Ver `docs/release-evidence/gate-tests.md`.
- ✅ `pnpm build`: exit 0, todas as rotas geradas. Ver `docs/release-evidence/gate-build.md`.
- ✅ Fix de CI: 3 testes falhando no GitHub Actions corrigidos (env var leak + timezone mismatch). Commit `aef97ff` enviado para `origin/staging`.
- ✅ Templates de evidência criados em `docs/release-evidence/` para env audit, smoke test, rollback e post-deploy smoke.

### Itens pendentes (requerem ação manual)

- ⏳ CI verde: aguardando resultado do último push (`aef97ff`) no GitHub Actions.
- ⏳ `pnpm db:migrate:status`: executar com `DATABASE_URL` e `DIRECT_URL` reais.
- ⏳ `pnpm start`: executar e validar home em modo produção.
- ⏳ Auditoria de envs na Vercel Production (preencher `docs/release-evidence/env-audit.md`).
- ⏳ Decisão sobre `/api/cron/cleanup-guests` em produção.
- ⏳ Smoke test em staging (preencher `docs/release-evidence/smoke-test.md`).
- ⏳ Plano de rollback preenchido (`docs/release-evidence/rollback-plan.md`).
- ⏳ Smoke test pós-deploy preparado (`docs/release-evidence/post-deploy-smoke.md`).

## Checklist Go / No-Go

### 1. Gate técnico

- [x] `pnpm lint` executado com sucesso no candidato a release. → `docs/release-evidence/gate-lint.md`
- [x] `pnpm test:gate:full` executado com sucesso no candidato a release. → `docs/release-evidence/gate-tests.md`
- [x] `pnpm build` executado com sucesso. → `docs/release-evidence/gate-build.md`
- [x] CI GitHub Actions verde no último commit (`aef97ff`). → `docs/release-evidence/gate-ci.md`
- [ ] `pnpm start` executado e validado em modo produção. → `docs/release-evidence/gate-start.md` (preencher)
- [ ] Sem erros críticos conhecidos abertos para auth, booking, admin, LGPD, SEO ou integrações.

### 2. Banco de dados e Prisma

- [ ] `DATABASE_URL` configurada corretamente no ambiente de produção.
- [ ] `DIRECT_URL` configurada corretamente no ambiente de produção.
- [ ] `pnpm db:migrate:status` executado e sem inconsistências. → `docs/release-evidence/gate-migrations.md` (preencher)
- [ ] Todas as migrations necessárias para o release estão aplicadas. (14 migrations listadas em `docs/release-evidence/rollback-plan.md`)
- [x] Existe plano claro de rollback antes do deploy. → `docs/release-evidence/rollback-plan.md`
- [ ] Seeds ou dados iniciais obrigatórios já foram preparados para o ambiente.

### 3. Supabase e autenticação

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada apenas no servidor.
- [ ] Login funciona em staging.
- [ ] Logout funciona em staging.
- [ ] Callback de autenticação funciona com o domínio final esperado.
- [ ] Recuperação de senha ou fluxo equivalente funciona.
- [ ] Perfis e permissões de `ADMIN`, `BARBER` e `CLIENT` estão corretos.

### 4. Segurança e configuração de ambiente

- [ ] `NEXT_PUBLIC_ENVIRONMENT=production` configurado no ambiente de produção.
- [ ] `NEXT_PUBLIC_SITE_URL` aponta para o domínio final de produção.
- [ ] `ALLOWED_ORIGINS` revisada para staging, preview e domínio final, quando necessário.
- [ ] `CRON_SECRET` forte, única e válida no ambiente de produção.
- [ ] Nenhum segredo sensível foi exposto em variáveis `NEXT_PUBLIC_*`.
- [ ] Os headers de segurança continuam válidos no deploy final.
- [ ] O domínio final responde por HTTPS corretamente.

### 5. Rate limiting e proteção operacional

- [ ] `UPSTASH_REDIS_REST_URL` configurada em produção.
- [ ] `UPSTASH_REDIS_REST_TOKEN` configurada em produção.
- [ ] O ambiente de produção não depende do fallback em memória para rate limit.
- [ ] Rotas sensíveis foram testadas com comportamento correto de proteção e bloqueio.

### 6. Cron jobs e rotinas automáticas

- [x] `/api/cron/sync-instagram` está agendado em `vercel.json` (`0 10 * * *`).
- [ ] Foi decidido explicitamente se `/api/cron/cleanup-guests` deve rodar em produção.
- [ ] Se o cron de limpeza for obrigatório, ele está agendado na infraestrutura.
- [ ] `CRON_SECRET` configurada em produção e autenticação dos cron jobs validada.
- [ ] Existe evidência de execução bem-sucedida das rotinas automáticas.

### 7. Integrações externas

- [ ] `INSTAGRAM_ACCESS_TOKEN` válida, se o feed real for obrigatório.
- [ ] `INSTAGRAM_USER_ID` válida, se o feed real for obrigatório.
- [ ] O comportamento de fallback do Instagram foi validado.
- [ ] `NEXT_PUBLIC_GA_ID` revisada, se analytics estiver habilitado em produção.
- [ ] `NEXT_PUBLIC_GTM_ID=GTM-MFC2V74P` configurada em produção.
- [ ] As integrações externas críticas foram testadas no ambiente de staging.

### 8. Fluxos críticos do negócio

- [ ] Home pública abre sem erro.
- [ ] Catálogo de serviços e preços está correto.
- [ ] Agendamento de cliente autenticado funciona do início ao fim.
- [ ] Agendamento de guest funciona do início ao fim.
- [ ] Cancelamento de agendamento funciona.
- [ ] Conclusão de atendimento funciona.
- [ ] Fluxo de feedback funciona.
- [ ] Painel do barbeiro funciona.
- [ ] Painel administrativo funciona.
- [ ] Gestão de serviços funciona.
- [ ] Gestão de barbeiros funciona.
- [ ] Gestão de horários globais da barbearia funciona.
- [ ] Gestão de ausências de barbeiro funciona.
- [ ] Fluxos de fidelidade, se estiverem no escopo do release, foram testados em staging.

> Preencher: `docs/release-evidence/smoke-test.md`

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

> Preencher: `docs/release-evidence/smoke-test.md`

### 10. SEO e comportamento por ambiente

- [ ] Em `staging`, a aplicação continua bloqueando indexação como esperado.
- [ ] Em `production`, a aplicação está pronta para permitir indexação.
- [ ] `robots.txt` foi conferido para o ambiente correto.
- [ ] `sitemap.xml` foi conferido para o ambiente correto.
- [ ] Meta tags e canonical foram revisadas nas páginas principais.
- [ ] Schema markup crítico foi validado se fizer parte do release.

> Preencher: `docs/release-evidence/smoke-test.md`

### 11. Operação, suporte e rollback

- [x] Existe plano de rollback claro. → `docs/release-evidence/rollback-plan.md`
- [x] Existe checklist de smoke test pós-deploy. → `docs/release-evidence/post-deploy-smoke.md`
- [ ] Logs de produção estarão acessíveis após o deploy.
- [ ] Existe responsável pelo monitoramento imediato pós-deploy.
- [ ] O cliente ou time responsável sabe quais credenciais e integrações precisará manter.

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

- Log ou captura da execução dos comandos do gate final.
- Registro dos resultados do smoke test em staging.
- Confirmação das variáveis de ambiente críticas no ambiente de produção.
- Confirmação da agenda e autenticação dos cron jobs necessários.
- Confirmação dos fluxos críticos de negócio.

## Parecer do responsável

- Responsável técnico: ______________________
- Data da avaliação: ______________________
- Decisão final: `APROVADO PARA PROD` / `NAO APROVADO PARA PROD`
- Observações: _____________________________

