# Checklist de Prontidão para Produção

## Objetivo

Este documento define o checklist mínimo para considerar o que está em `staging` apto para entrar em produção no projeto Gold Mustache Web.

## Regra de decisão

- `APROVADO PARA PROD`: todos os itens críticos marcados, sem bloqueadores abertos, com evidência recente.
- `NAO APROVADO PARA PROD`: qualquer item crítico pendente, sem evidência, ou com risco operacional relevante.

## Status atual

**Decisão atual: NAO APROVADO PARA PROD**

### Motivos da decisão atual

- Não há evidência recente registrada no repositório de execução do gate final de release com `pnpm lint`, `pnpm test:gate:full`, `pnpm build`, `pnpm db:migrate:status` e validação manual com `pnpm start`.
- Há evidência de um cron configurado em `vercel.json` para `/api/cron/sync-instagram`, mas não encontrei configuração publicada no repositório para `/api/cron/cleanup-guests`, embora exista endpoint de limpeza protegido por `CRON_SECRET`.
- Não encontrei no repositório uma evidência consolidada de smoke test em staging cobrindo autenticação, agendamento, áreas protegidas e rotinas administrativas.
- Não há evidência consolidada no repositório de conferência final das variáveis críticas de produção, banco, Supabase, Upstash e cron.

## Checklist Go / No-Go

### 1. Gate técnico

- [ ] `pnpm lint` executado com sucesso no candidato a release.
- [ ] `pnpm test:gate:full` executado com sucesso no candidato a release.
- [ ] `pnpm build` executado com sucesso.
- [ ] `pnpm start` executado e validado em modo produção.
- [ ] Sem erros críticos conhecidos abertos para auth, booking, admin, LGPD, SEO ou integrações.

### 2. Banco de dados e Prisma

- [ ] `DATABASE_URL` configurada corretamente no ambiente de produção.
- [ ] `DIRECT_URL` configurada corretamente no ambiente de produção.
- [ ] `pnpm db:migrate:status` executado e sem inconsistências.
- [ ] Todas as migrations necessárias para o release estão aplicadas.
- [ ] Existe backup recente ou plano claro de rollback antes do deploy.
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

- [ ] `/api/cron/sync-instagram` está agendado e autenticado corretamente.
- [ ] Foi decidido explicitamente se `/api/cron/cleanup-guests` deve rodar em produção.
- [ ] Se o cron de limpeza for obrigatório, ele está agendado na infraestrutura.
- [ ] Todos os cron jobs exigidos enviam `Authorization: Bearer {CRON_SECRET}`.
- [ ] Existe evidência de execução bem-sucedida das rotinas automáticas.

### 7. Integrações externas

- [ ] `INSTAGRAM_ACCESS_TOKEN` válida, se o feed real for obrigatório.
- [ ] `INSTAGRAM_USER_ID` válida, se o feed real for obrigatório.
- [ ] O comportamento de fallback do Instagram foi validado.
- [ ] `NEXT_PUBLIC_GA_ID` revisada, se analytics estiver habilitado em produção.
- [ ] `NEXT_PUBLIC_GTM_ID` revisada, se GTM estiver habilitado em produção.
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

### 10. SEO e comportamento por ambiente

- [ ] Em `staging`, a aplicação continua bloqueando indexação como esperado.
- [ ] Em `production`, a aplicação está pronta para permitir indexação.
- [ ] `robots.txt` foi conferido para o ambiente correto.
- [ ] `sitemap.xml` foi conferido para o ambiente correto.
- [ ] Meta tags e canonical foram revisadas nas páginas principais.
- [ ] Schema markup crítico foi validado se fizer parte do release.

### 11. Operação, suporte e rollback

- [ ] Logs de produção estarão acessíveis após o deploy.
- [ ] Existe responsável pelo monitoramento imediato pós-deploy.
- [ ] Existe plano de rollback claro.
- [ ] Existe checklist de smoke test pós-deploy.
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

