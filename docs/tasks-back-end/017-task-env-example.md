# 017 - Criar arquivo .env.example

## Prioridade: 🟡 MÉDIA (DevEx / Documentação)

## Status: ✅ RESOLVIDO

## Problema (original)

O projeto não possuía um `.env.example`. Novos desenvolvedores precisavam descobrir quais variáveis de ambiente são necessárias lendo o código ou a documentação espalhada.

## Solução aplicada

Criado `.env.example` na raiz com 17 variáveis documentadas por seção (Database, Supabase, Site, Rate Limiting, Instagram, Cron, Analytics). Scan do codebase identificou duas variáveis extras não previstas na spec original (`INSTAGRAM_MAX_RETRIES`, `INSTAGRAM_POSTS_LIMIT`), que foram incluídas. Variáveis auto-fornecidas por runtime (`NODE_ENV`, `VERCEL_ENV`, `VERCEL_URL`, `VITEST`) foram excluídas por não fazerem sentido no template.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `.env.example` | **Novo** — template com todas as variáveis documentadas |
| `.gitignore` | Adicionado `!.env.example` para exceção ao padrão `.env*` |
| `README.md` | Instruções de setup com `cp .env.example .env.local`; corrigido `npm` → `pnpm` |

## Checklist

- [x] Criar `.env.example` na raiz
- [x] Verificar se há variáveis faltando comparando com uso no código
- [x] Adicionar ao README instruções para copiar para `.env.local`
- [x] Garantir que `.env.example` está no git (e `.env.local` no `.gitignore`)
