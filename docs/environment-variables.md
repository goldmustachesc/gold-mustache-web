# Variáveis de Ambiente

Este documento descreve as variáveis de ambiente necessárias para o projeto Gold Mustache Web.

## Configuração de Ambiente

### `NEXT_PUBLIC_ENVIRONMENT`

Define o ambiente atual da aplicação.

| Valor | Descrição |
|-------|-----------|
| `development` | Ambiente de desenvolvimento local |
| `staging` | Ambiente de homologação/staging |
| `production` | Ambiente de produção |

**Nota:** Se não definido, será inferido automaticamente:
- `VERCEL_ENV=production` → `production`
- `VERCEL_ENV=preview` → `staging`
- Caso contrário → `development`

### `NEXT_PUBLIC_SITE_URL`

URL base do site (sem trailing slash).

| Ambiente | Exemplo |
|----------|---------|
| Production | `https://www.goldmustachebarbearia.com.br` |
| Staging | `https://staging.goldmustachebarbearia.com.br` |
| Development | `http://localhost:3001` |

**Nota:** Se não definido, usa `VERCEL_URL` automaticamente em deployments Vercel. Trailing slashes e paths são normalizados automaticamente. Variantes www/non-www são aceitas automaticamente.

### `ALLOWED_ORIGINS`

Origens adicionais permitidas para verificação CSRF (server-only, não exposta ao cliente). Útil quando o domínio custom difere de `NEXT_PUBLIC_SITE_URL` (ex: staging com domínio próprio).

```
ALLOWED_ORIGINS="https://staging.goldmustachebarbearia.com.br,https://preview.goldmustachebarbearia.com.br"
```

- Separar múltiplas origens por vírgula
- Variantes www/non-www são adicionadas automaticamente
- Trailing slashes e paths são normalizados automaticamente

---

## Supabase

### `NEXT_PUBLIC_SUPABASE_URL`

URL do projeto Supabase.

```
https://your-project.supabase.co
```

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Chave anônima (public) do Supabase.

### `SUPABASE_SERVICE_ROLE_KEY`

Chave **service role** do Supabase (admin) usada apenas por scripts de seed/administração (ex.: `prisma/seed-barber.ts`, `prisma/seed-admin.ts`).

**Atenção:** nunca exponha essa chave no client. Mantenha apenas no servidor/CI/local.

---

## Google Analytics

### `NEXT_PUBLIC_GA_ID`

ID de rastreamento do Google Analytics.

```
G-XXXXXXXXXX
```

**Nota:** O analytics é automaticamente desabilitado em ambientes não-produção.

---

## Google Tag Manager

### `NEXT_PUBLIC_GTM_ID`

ID do contêiner do Google Tag Manager.

```
GTM-XXXXXXXXX
```

**Nota:** O GTM só é carregado com consentimento explícito do usuário (LGPD).

---

## Instagram API

### `INSTAGRAM_ACCESS_TOKEN`

Token de acesso da API do Instagram (opcional).

### `INSTAGRAM_USER_ID`

ID do usuário do Instagram (opcional).

---

## Prisma / Banco de Dados

### `DATABASE_URL`

String de conexão do Postgres usada pelo Prisma (migrações e queries).

### `DIRECT_URL`

String de conexão direta (sem pooler), recomendada pelo Supabase para operações administrativas/migrações.

---

## Upstash (Rate Limiting)

O rate limiting usa Upstash Redis para proteção contra abuso de API.

### `UPSTASH_REDIS_REST_URL`

URL do endpoint REST do Upstash Redis.

```
https://your-instance.upstash.io
```

### `UPSTASH_REDIS_REST_TOKEN`

Token de autenticação do Upstash Redis.

**Como obter:**
1. Crie uma conta em [upstash.com](https://upstash.com)
2. Crie um novo banco Redis
3. Copie o `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` das configurações

**Nota:** Se não configurado, o projeto cai em fallback local em memória. Serve para desenvolvimento e instância única, mas não é suficiente para produção multi-instância.

---

## Email transacional (Resend)

### `RESEND_API_KEY`

Token da API do Resend usado pelos emails de confirmação, cancelamento e lembrete.

### `EMAIL_FROM`

Remetente usado nos emails transacionais.

```bash
EMAIL_FROM="Gold Mustache <noreply@seudominio.com>"
```

### `EMAIL_REPLY_TO`

Endereço opcional de resposta.

**Plano sugerido para launch:** Resend Free (`3.000 emails/mês`, limite de `100/dia`).

---

## Cron Jobs

### `CRON_SECRET`

Token secreto para autenticar chamadas de cron jobs e automações externas (ex: GitHub Actions de lembretes).

```
CRON_SECRET=seu-token-secreto-aqui
```

**Como gerar:** `openssl rand -base64 32`

**Uso:** Enviar no header `Authorization: Bearer {CRON_SECRET}`

### `APPOINTMENT_REMINDERS_URL`

URL do endpoint de produção chamado pelo workflow de GitHub Actions para enviar lembretes automáticos.

```bash
APPOINTMENT_REMINDERS_URL=https://www.goldmustachebarbearia.com.br/api/cron/appointment-reminders
```

**Observação:** esse valor é usado apenas na automação de lembretes; não é lido pela aplicação em runtime. A escolha por GitHub Actions existe porque a Vercel Hobby só permite cron diário.

---

## Observabilidade

### `NEXT_PUBLIC_SENTRY_DSN`

DSN público do Sentry para captura client-side.

### `SENTRY_DSN`

DSN server-side do Sentry.

### `SENTRY_ORG`

Slug da organização no Sentry. Necessário para sourcemaps no build.

### `SENTRY_PROJECT`

Slug do projeto no Sentry. Necessário para sourcemaps no build.

### `SENTRY_AUTH_TOKEN`

Token do Sentry usado pelo build para upload de sourcemaps.

### `LOG_LEVEL`

Nível do `pino` (`debug`, `info`, `warn`, `error`).

**Plano sugerido para launch:** Sentry Developer Free (`5k errors/mês`, `5GB logs`, `5M spans`, `1 cron monitor`, retenção de `30 dias`).

---

## Feature Flags operacionais

### `FEATURE_FLAG_TRANSACTIONAL_EMAILS`

Liga o envio de emails transacionais.

### `FEATURE_FLAG_APPOINTMENT_REMINDERS`

Liga o processamento automático do cron de lembretes.

### `FEATURE_FLAG_APPOINTMENT_REMINDERS_WHATSAPP`

Liga o canal WhatsApp no fluxo de lembretes.

**Recomendação de rollout:** manter `false` até validar secrets, staging e operação manual do barbeiro.

---

## Ferramentas de Desenvolvimento Local

### `SNYK_TOKEN`

Token opcional para autenticação não interativa do Snyk CLI.

```
SNYK_TOKEN=seu-token-da-snyk
```

- Use apenas no ambiente local/CI
- Para uso no Codex, prefira exportar em `.envrc.local` ou no shell, não em `.env.local`
- Alternativamente, autentique com OAuth via `pnpm snyk:auth`
- No GitHub Actions, configure o valor como secret do repositório com o nome `SNYK_TOKEN`; sem ele, a etapa de Snyk no CI será pulada

---

## Comportamento por Ambiente

### Staging (Homologação)

| Feature | Status |
|---------|--------|
| Crawlers | ❌ Bloqueados (`robots.txt: Disallow: /`) |
| Sitemap | ❌ Vazio |
| Schema Markup (SEO) | ❌ Desabilitado |
| Google Analytics | ❌ Desabilitado |
| Meta Robots | `noindex, nofollow` |

### Production

| Feature | Status |
|---------|--------|
| Crawlers | ✅ Permitidos |
| Sitemap | ✅ Completo |
| Schema Markup (SEO) | ✅ Ativo |
| Google Analytics | ✅ Ativo |
| Meta Robots | `index, follow` |

---

## Configuração no Vercel

### Para ambiente de Staging

1. Vá para o projeto no Vercel
2. Settings → Environment Variables
3. Adicione:

```
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SITE_URL=https://staging.goldmustachebarbearia.com.br
ALLOWED_ORIGINS=https://staging.goldmustachebarbearia.com.br
```

4. Selecione "Preview" como o ambiente de destino

### Para ambiente de Produção

1. Vá para o projeto no Vercel
2. Settings → Environment Variables
3. Adicione:

```
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SITE_URL=https://www.goldmustachebarbearia.com.br
NEXT_PUBLIC_GTM_ID=GTM-MFC2V74P
```

4. Selecione "Production" como o ambiente de destino
