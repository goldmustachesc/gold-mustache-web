# 017 - Criar arquivo .env.example

## Prioridade: 🟡 MÉDIA (DevEx / Documentação)

## Problema

O projeto não possui um `.env.example`. Novos desenvolvedores precisam descobrir quais variáveis de ambiente são necessárias lendo o código ou a documentação espalhada.

## O que criar

Arquivo `.env.example` na raiz do projeto com todas as variáveis documentadas:

```bash
# ===================================
# Gold Mustache - Variáveis de Ambiente
# ===================================
# Copie este arquivo para .env.local e preencha os valores

# ---- Banco de Dados (Prisma + PostgreSQL) ----
# Obrigatório
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# ---- Supabase (Autenticação) ----
# Obrigatório
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
# Obrigatório para operações admin (delete user, seeds)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ---- Site ----
# Obrigatório em produção, usado para verificação de origem (CSRF)
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
# Detecção de ambiente (development | staging | production)
NEXT_PUBLIC_ENVIRONMENT="development"

# ---- Rate Limiting (Upstash Redis) ----
# Recomendado em produção — sem isso, rate limiting fica desabilitado
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# ---- Instagram Integration ----
# Opcional — necessário apenas para feed de Instagram
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_USER_ID=""

# ---- Cron Jobs ----
# Obrigatório se usar cron endpoints (sync-instagram, cleanup-guests)
CRON_SECRET="your-random-secret"

# ---- Analytics ----
# Opcional
NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_GTM_ID=""
```

## Checklist

- [ ] Criar `.env.example` na raiz
- [ ] Verificar se há variáveis faltando comparando com uso no código
- [ ] Adicionar ao README instruções para copiar para `.env.local`
- [ ] Garantir que `.env.example` está no git (e `.env.local` no `.gitignore`)
