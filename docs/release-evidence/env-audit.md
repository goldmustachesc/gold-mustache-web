# Auditoria de Variáveis de Ambiente — Produção

**Data:** 2026-03-20
**Responsável:** Agent (Playwright MCP + `vercel env ls`)
**Fonte:** `npx vercel env ls production` — projeto `gold-mustache-web` / team `gold-mustache-scs-projects`

## Banco de dados

| Variável | Configurada |
|----------|-------------|
| `DATABASE_URL` | [x] Sim / [ ] Não |
| `DIRECT_URL` | [x] Sim / [ ] Não |

## Supabase

| Variável | Configurada |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [x] Sim / [ ] Não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [x] Sim / [ ] Não |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | [x] Sim / [ ] Não (chave alternativa gerada pelo Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` (server only) | [x] Sim / [ ] Não |

## Ambiente e Segurança

| Variável | Valor esperado | Configurada |
|----------|----------------|-------------|
| `NEXT_PUBLIC_ENVIRONMENT` | `production` | [x] Sim / [ ] Não (configurada 1h antes da auditoria) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.goldmustachebarbearia.com.br` | [x] Sim / [ ] Não (configurada 1h antes da auditoria) |
| `ALLOWED_ORIGINS` | domínios extras se necessário | [ ] Sim / [x] N/A (não encontrada; verificar se é necessária para CORS) |
| `CRON_SECRET` | gerado com `openssl rand -base64 32` | [x] Sim / [ ] Não |
| `NODE_ENV` | `production` | [x] Sim / [ ] Não |

> ⚠️ `CRON_SECRET` de produção **não deve ser reutilizado** do ambiente de staging.

## Rate Limiting (Upstash)

| Variável | Configurada |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | [x] Sim / [ ] Não (Production + Preview + Development) |
| `UPSTASH_REDIS_REST_TOKEN` | [x] Sim / [ ] Não (Production + Preview + Development) |

> ✅ Adicionado em 2026-03-20. As chaves são compartilhadas entre ambientes, mas o código isola
> os buckets por prefixo (`ratelimit:production:*` vs `ratelimit:staging:*`) via a variável
> `NEXT_PUBLIC_ENVIRONMENT` — sem risco de colisão.

## Integrações Externas

| Variável | Obrigatória | Configurada |
|----------|-------------|-------------|
| `INSTAGRAM_ACCESS_TOKEN` | [x] Sim (feed real) | [x] Sim / [ ] Não |
| `INSTAGRAM_USER_ID` | [x] Sim (feed real) | [x] Sim / [ ] Não |
| `NEXT_PUBLIC_GTM_ID` | Sim (`GTM-MFC2V74P`) | [x] Sim / [ ] Não (configurada 24d atrás) |
| `NEXT_PUBLIC_GA_ID` | [ ] Sim (analytics) | [x] Sim / [ ] Não |

## Cron Jobs

| Cron | Agendado | CRON_SECRET configurado |
|------|----------|------------------------|
| `/api/cron/sync-instagram` | ✅ `vercel.json` — `0 10 * * *` | [x] Sim / [ ] Não |
| `/api/cron/cleanup-guests` | [ ] Sim / [ ] Decidido não agendar | [ ] Sim / [ ] N/A |

> Decisão sobre `cleanup-guests`: **pendente** — deve ser explicitamente decidido antes do deploy.

## Checklist de Segurança Final

- [x] Nenhum segredo exposto em variável `NEXT_PUBLIC_*` (SERVICE_ROLE_KEY é server-only ✅)
- [ ] Headers de segurança válidos no deploy final (validar no deploy)
- [ ] Domínio final responde por HTTPS (validar no deploy)
- [ ] Backups automáticos do banco habilitados no Supabase (verificar no Supabase Dashboard)

## Resumo de variáveis por ambiente

| Variável | Production | Preview/Staging |
|----------|-----------|-----------------|
| DATABASE_URL | ✅ | ✅ |
| DIRECT_URL | ✅ | ✅ |
| NEXT_PUBLIC_SUPABASE_URL | ✅ | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ✅ |
| NEXT_PUBLIC_ENVIRONMENT | ✅ | ✅ |
| NEXT_PUBLIC_SITE_URL | ✅ | ✅ |
| CRON_SECRET | ✅ | ✅ |
| NODE_ENV | ✅ | ✅ |
| NEXT_PUBLIC_GA_ID | ✅ | ✅ |
| NEXT_PUBLIC_GTM_ID | ✅ | ❌ ausente em Preview |
| INSTAGRAM_ACCESS_TOKEN | ✅ | ✅ |
| INSTAGRAM_USER_ID | ✅ | ✅ |
| UPSTASH_REDIS_REST_URL | ✅ | ✅ |
| UPSTASH_REDIS_REST_TOKEN | ✅ | ✅ |
| ALLOWED_ORIGINS | ❌ não encontrada | ❌ não encontrada |

## Status: [x] APROVADO / [ ] BLOQUEADO

**Todas as variáveis críticas estão configuradas em Production.**

**Observações:**
- `NEXT_PUBLIC_ENVIRONMENT=production` e `NEXT_PUBLIC_SITE_URL` configuradas em 2026-03-20.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` adicionadas em 2026-03-20 (compartilhadas entre ambientes com isolamento por prefixo de chave no código).
- `ALLOWED_ORIGINS` não encontrada — confirmar se é necessária para CORS da aplicação.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` presente em ambos os ambientes — pode ser redundante com `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Auditoria realizada via `npx vercel env ls production` — valores encriptados, não expostos neste documento.
