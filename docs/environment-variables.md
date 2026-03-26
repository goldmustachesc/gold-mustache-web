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

**Nota:** Se não configurado, o rate limiting será desabilitado (útil para desenvolvimento local).

---

## Cron Jobs

### `CRON_SECRET`

Token secreto para autenticar chamadas de cron jobs (ex: limpeza de dados de guests).

```
CRON_SECRET=seu-token-secreto-aqui
```

**Como gerar:** `openssl rand -base64 32`

**Uso:** Enviar no header `Authorization: Bearer {CRON_SECRET}`

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

