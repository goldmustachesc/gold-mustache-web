# Gate de Promoção — Staging para Production

**Data:** 2026-03-28
**Versão/Branch:** `staging`
**Ambiente Origem:** Staging
**Ambiente Destino:** Production

---

## Critérios de Saída

Cada item deve estar marcado como `✅ Aprovado`, `N/A`, ou documentar bloqueador.

### 1. Testes Automatizados

| Critério | Status | Evidência |
|----------|--------|-----------|
| Todos os testes unitários passam | ✅ | 2487 testes, 330 arquivos (2026-03-28) |
| Build de produção completa | ✅ | Build bem-sucedido (55.9s) |
| Lint sem erros | ✅ | 4 warnings (aceitáveis - mocks de teste) |
| Coverage mínimo atingido | [ ] | Ainda não validado com `pnpm test:gate` |

**Comando de validação:**
```bash
pnpm test:gate
```

**Última execução:** 2026-03-28

### 2. Configuração Supabase (Dashboard)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Projeto staging identificado e correto | [ ] | |
| RLS habilitado na tabela `notifications` | [ ] | |
| Policies de `notifications` configuradas | [ ] | |
| Teste de isolamento Realtime passou | [ ] | |
| Google OAuth configurado e funcionando | [ ] | |
| Password recovery configurado e testado | [ ] | |
| Redirect URLs corretas para staging | [ ] | |

### 3. Configuração Vercel (Variáveis)

| Critério | Status | Evidência |
|----------|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` configurada | ✅ | Verificado via CLI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada | ✅ | Verificado via CLI |
| `SUPABASE_SERVICE_ROLE_KEY` configurada (server-only) | ✅ | Verificado via CLI |
| `NEXT_PUBLIC_ENVIRONMENT` = staging | ✅ | Escopado para branch staging |
| `NEXT_PUBLIC_SITE_URL` correta | ✅ | Verificado via CLI |
| `CRON_SECRET` configurada | ✅ | Verificado via CLI |
| `UPSTASH_REDIS_*` configuradas | ✅ | Compartilhado |

### 4. Validação Funcional (Manual)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Login email/senha funciona | [ ] | |
| Logout funciona | [ ] | |
| Google OAuth funciona | [ ] | |
| Password recovery funciona | [ ] | |
| RBAC ADMIN funciona | [ ] | |
| RBAC BARBER funciona | [ ] | |
| RBAC CLIENT funciona | [ ] | |
| Delete account funciona | [ ] | |
| Notificações Realtime isoladas | [ ] | |

### 5. Segurança

| Critério | Status | Evidência |
|----------|--------|-----------|
| Headers de segurança configurados | ✅ | Verificado em `next.config.ts` |
| CSRF protection ativo | ✅ | `verify-origin.ts` |
| Rate limiting ativo | ✅ | Upstash Redis |
| service_role não exposta no cliente | ✅ | Sem prefixo NEXT_PUBLIC_ |
| Fallback seguro quando keys ausentes | ✅ | Verificado em código |

### 6. Documentação

| Critério | Status | Evidência |
|----------|--------|-----------|
| Auditoria de staging preenchida | [ ] | `staging-supabase-audit.md` |
| Evidências funcionais registradas | [ ] | `staging-functional-evidence.md` |
| Análise de hardening aprovada | ✅ | `architecture-hardening-analysis.md` |
| Blast radius documentado | ✅ | `service-role-blast-radius.md` |

---

## Bloqueadores

| ID | Descrição | Severidade | Responsável | Prazo |
|----|-----------|------------|-------------|-------|
| 1 | RLS na tabela `notifications` não verificado | Alta | | |
| 2 | Teste de isolamento Realtime não executado | Alta | | |
| 3 | Google OAuth não testado em staging | Média | | |
| 4 | Password recovery não testado em staging | Média | | |

---

## Decisões Pendentes

| Item | Opções | Decisão | Justificativa |
|------|--------|---------|---------------|
| `ALLOWED_ORIGINS` | Configurar / Não configurar | | |
| Projetos Supabase | Compartilhado / Separado por ambiente | | |
| Rotação de chaves | Trimestral / Semestral / Manual | | |

---

## Checklist de Promoção

Quando todos os critérios estiverem aprovados:

1. [ ] Preencher `production-supabase-audit.md`
2. [ ] Replicar configurações Supabase em production
3. [ ] Verificar variáveis Vercel production
4. [ ] Executar smoke test pós-deploy
5. [ ] Monitorar logs nas primeiras 24h

---

## Aprovação

| Papel | Nome | Assinatura | Data |
|-------|------|------------|------|
| Desenvolvedor | | | |
| Reviewer | | | |

**Status Final:** `[ ] APROVADO PARA PROMOÇÃO` / `[ ] BLOQUEADO`

**Observações:**
_______________________________________________________________
