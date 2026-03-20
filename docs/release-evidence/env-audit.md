# Auditoria de Variáveis de Ambiente — Produção

**Data:** ______________________
**Responsável:** ______________________
**Fonte:** Vercel Dashboard → Settings → Environment Variables → Production

## Banco de dados

| Variável | Configurada |
|----------|-------------|
| `DATABASE_URL` | [ ] Sim / [ ] Não |
| `DIRECT_URL` | [ ] Sim / [ ] Não |

## Supabase

| Variável | Configurada |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [ ] Sim / [ ] Não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [ ] Sim / [ ] Não |
| `SUPABASE_SERVICE_ROLE_KEY` (server only) | [ ] Sim / [ ] Não |

## Ambiente e Segurança

| Variável | Valor esperado | Configurada |
|----------|----------------|-------------|
| `NEXT_PUBLIC_ENVIRONMENT` | `production` | [ ] Sim / [ ] Não |
| `NEXT_PUBLIC_SITE_URL` | `https://www.goldmustachebarbearia.com.br` | [ ] Sim / [ ] Não |
| `ALLOWED_ORIGINS` | domínios extras se necessário | [ ] Sim / [ ] N/A |
| `CRON_SECRET` | gerado com `openssl rand -base64 32` | [ ] Sim / [ ] Não |

> ⚠️ `CRON_SECRET` de produção **não deve ser reutilizado** do ambiente de staging.

## Rate Limiting (Upstash)

| Variável | Configurada |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | [ ] Sim / [ ] Não |
| `UPSTASH_REDIS_REST_TOKEN` | [ ] Sim / [ ] Não |

> Se não configurado, o rate limit cai para fallback em memória — **não aceitável em produção**.

## Integrações Externas

| Variável | Obrigatória | Configurada |
|----------|-------------|-------------|
| `INSTAGRAM_ACCESS_TOKEN` | [ ] Sim / [ ] Não (feed real) | [ ] Sim / [ ] Não |
| `INSTAGRAM_USER_ID` | [ ] Sim / [ ] Não (feed real) | [ ] Sim / [ ] Não |
| `NEXT_PUBLIC_GTM_ID` | Sim (`GTM-MFC2V74P`) | [ ] Sim / [ ] Não |
| `NEXT_PUBLIC_GA_ID` | [ ] Sim / [ ] Não (analytics) | [ ] Sim / [ ] Não |

## Cron Jobs

| Cron | Agendado | CRON_SECRET configurado |
|------|----------|------------------------|
| `/api/cron/sync-instagram` | ✅ `vercel.json` — `0 10 * * *` | [ ] Sim / [ ] Não |
| `/api/cron/cleanup-guests` | [ ] Sim / [ ] Decidido não agendar | [ ] Sim / [ ] N/A |

> Decisão sobre `cleanup-guests`: ______________________

## Checklist de Segurança Final

- [ ] Nenhum segredo exposto em variável `NEXT_PUBLIC_*`
- [ ] Headers de segurança válidos no deploy final
- [ ] Domínio final responde por HTTPS
- [ ] Backups automáticos do banco habilitados no Supabase

## Status: [ ] APROVADO / [ ] BLOQUEADO

Observações: ______________________
