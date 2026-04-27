# Loyalty Cron Jobs — Ops Guide

## Scheduled Jobs

| Job | Path | Schedule (UTC) | BRT equiv |
|-----|------|---------------|-----------|
| Expirar pontos | `POST /api/cron/loyalty/expire-points` | `30 3 * * *` | 00:30 |
| Bônus de aniversário | `POST /api/cron/loyalty/birthday-bonuses` | `0 9 * * *` | 06:00 |

## Variáveis de Ambiente

| Var | Obrigatória | Descrição |
|-----|------------|-----------|
| `CRON_SECRET` | Sim | Segredo compartilhado para autenticar chamadas do Vercel Cron. Deve ter **≥32 chars de alta entropia** (`openssl rand -hex 32`). |
| `FEATURE_FLAG_LOYALTY_PROGRAM` | Não | Define `true` para ativar via env (bypass do banco). Sem esta var, a flag é lida do banco. |

## Disparo Manual

```bash
# Expirar pontos
curl -X POST https://<seu-dominio>/api/cron/loyalty/expire-points \
  -H "Authorization: Bearer $CRON_SECRET"

# Bônus de aniversário
curl -X POST https://<seu-dominio>/api/cron/loyalty/birthday-bonuses \
  -H "Authorization: Bearer $CRON_SECRET"
```

Em staging/dev local (`http://localhost:3001`), o `GET` também retorna instruções de uso.

## Verificar Execução no Vercel

1. Dashboard → projeto → aba **Cron Jobs**
2. Confirmar que os 3 crons aparecem (sync-instagram + 2 loyalty)
3. Logs em **Functions** → filtrar por `[loyalty-cron]`

## Idempotência

Ambos os jobs são seguros para re-execução:
- `expire-points`: filtra IDs já presentes em transações `EXPIRED`
- `birthday-bonuses`: usa `referenceId = "birthday-{year}"` para evitar crédito duplicado anual

## Desativar sem Deploy

Desabilitar a flag `loyaltyProgram` no admin UI (`/admin/configuracoes`) — os crons retornam `{ skipped: true }` sem processar nada.

## Fallback Manual

Admin endpoints permanecem ativos para disparo manual autenticado:
- `POST /api/admin/loyalty/expire-points`
- `POST /api/admin/loyalty/birthday-bonuses`
