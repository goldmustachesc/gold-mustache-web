# Auditoria de Segurança Supabase

Esta pasta contém a documentação e scripts para auditoria de segurança da superfície Supabase do projeto Gold Mustache.

## Estrutura

| Arquivo | Descrição |
|---------|-----------|
| `staging-supabase-audit.md` | Checklist completo de auditoria para staging |
| `production-supabase-audit.md` | Checklist completo de auditoria para production |
| `rls-policies-notifications.sql` | Script SQL para policies RLS da tabela notifications |
| `rls-policies-sensitive-tables.sql` | Script SQL para RLS em tabelas sensíveis (defesa em profundidade) |
| `realtime-isolation-test.md` | Guia de teste de isolamento do Realtime |
| `service-role-blast-radius.md` | Análise de risco do uso de service_role |
| `architecture-hardening-analysis.md` | Análise de hardening da arquitetura |
| `staging-functional-evidence.md` | Template de evidências funcionais |
| `staging-to-production-gate.md` | Critérios de gate para promoção |
| `production-rollout-checklist.md` | Checklist de rollout para production |

## Ordem de Execução

1. **Preencher `staging-supabase-audit.md`** — Auditoria manual no Supabase Dashboard
2. **Executar `rls-policies-notifications.sql`** — Se RLS não estiver configurado
3. **Executar testes de `realtime-isolation-test.md`** — Validar isolamento
4. **Revisar `service-role-blast-radius.md`** — Confirmar mitigações
5. **Preencher `production-supabase-audit.md`** — Apenas após staging aprovado

## Status Atual

| Ambiente | Status | Última atualização |
|----------|--------|-------------------|
| Staging | `Testes automatizados OK - Pendente auditoria manual Supabase` | 2026-03-28 |
| Production | `Bloqueado por staging` | - |

### Progresso

- [x] Inventário de variáveis Vercel (staging e production)
- [x] Análise de hardening da arquitetura
- [x] Documentação de blast radius service_role
- [x] Script SQL para RLS de notifications
- [x] Guia de teste de isolamento Realtime
- [x] Última execução local de testes automatizados passando (2487 testes, 330 arquivos)
- [x] Build de produção OK
- [x] Lint OK (4 warnings aceitáveis)
- [ ] Auditoria manual no Supabase Dashboard
- [ ] Testes funcionais manuais
- [ ] Gate de promoção aprovado

## Inventário de Variáveis Vercel (Verificado via CLI)

### Preview (Staging)

| Variável | Presente | Escopo |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✓ | Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Preview |
| `DATABASE_URL` | ✓ | Preview |
| `DIRECT_URL` | ✓ | Preview |
| `NEXT_PUBLIC_ENVIRONMENT` | ✓ | Preview (staging) |
| `NEXT_PUBLIC_SITE_URL` | ✓ | Preview |
| `CRON_SECRET` | ✓ | Preview |
| `UPSTASH_REDIS_REST_URL` | ✓ | Compartilhado |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | Compartilhado |

### Production

| Variável | Presente | Escopo |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | ✓ | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Production |
| `DATABASE_URL` | ✓ | Production |
| `DIRECT_URL` | ✓ | Production |
| `NEXT_PUBLIC_ENVIRONMENT` | ✓ | Production |
| `NEXT_PUBLIC_SITE_URL` | ✓ | Production |
| `CRON_SECRET` | ✓ | Production |
| `NEXT_PUBLIC_GTM_ID` | ✓ | Production |
| `NEXT_PUBLIC_GA_ID` | ✓ | Production |
| `UPSTASH_REDIS_REST_URL` | ✓ | Compartilhado |
| `UPSTASH_REDIS_REST_TOKEN` | ✓ | Compartilhado |

**Nota:** `ALLOWED_ORIGINS` não está configurada em nenhum ambiente. Avaliar necessidade.

## Próximos Passos

1. [ ] Acessar Supabase Dashboard e completar auditoria de staging
2. [ ] Executar script SQL de RLS se necessário
3. [ ] Executar testes de isolamento
4. [ ] Preencher gate de promoção
5. [ ] Repetir para production

## Referências

- [Documentação de Environment Variables](../environment-variables.md)
- [Google OAuth Setup](../google-oauth-setup.md)
- [Checklist de Prontidão para Produção](../checklist-prontidao-producao.md)
- [Smoke Test de Release](../release-evidence/smoke-test.md)
