# 021 - Mover cache do Instagram para fora do filesystem

## Prioridade: 🟢 BAIXA (Infraestrutura)

## Problema

O cron job `POST /api/cron/sync-instagram` grava os posts do Instagram em `public/data/instagram-cache.json`. Esse arquivo fica no filesystem do servidor.

Na Vercel (e outras plataformas serverless), o filesystem é **read-only** em produção — exceto `/tmp`. Isso significa que:
- O cron pode falhar silenciosamente ao tentar gravar
- Cada deploy substitui o arquivo pelo que existia no build
- Diferentes instâncias serverless não compartilham o arquivo

## Arquivos afetados

- `src/app/api/cron/sync-instagram/route.ts` — grava em `public/data/instagram-cache.json`
- `src/app/api/instagram/posts/route.ts` — lê o cache

## Alternativas

### Opção A: Banco de dados (recomendada)
Criar tabela `InstagramCache` no Prisma com campos `posts` (JSON), `updatedAt`. O cron grava no banco, o endpoint lê do banco.

### Opção B: KV Store (Vercel KV / Upstash Redis)
Já que o projeto usa Upstash Redis, gravar o cache lá com TTL.

### Opção C: Manter filesystem com fallback
Gravar em `/tmp` (funciona na Vercel), com fallback para dados estáticos do build.

## Checklist

- [x] Escolher abordagem (A, B ou C) — Opção B (Upstash Redis)
- [x] Atualizar cron para gravar no novo local — `setInstagramCache()` via Redis
- [x] Atualizar endpoint de leitura para buscar do novo local — `getInstagramCache()` via Redis
- [x] Manter fallback com dados mock se cache não existir — fallback para `MOCK_POSTS`
- [x] Testar em produção (Vercel) que o cron funciona
- [x] Remover `public/data/instagram-cache.json` do git se migrar — removido
