# Design — loyalty-automation

## Overview

Adicionar scheduler diário para os jobs já implementados em `ExpirationService.expirePoints` e `BirthdayService.creditBirthdayBonuses`. Dois novos route handlers em `src/app/api/cron/loyalty/**`, autenticados via `CRON_SECRET` (mesmo padrão dos crons existentes), registrados em `vercel.json`. Nenhuma mudança de service layer; apenas wrappers HTTP, gate de feature flag e observabilidade.

## Decisão de plataforma

- **Vercel Cron** (escolhido). Justificativas:
  - `vercel.json` já contém `crons` (`/api/cron/sync-instagram`) e os endpoints `src/app/api/cron/cleanup-guests/` e `sync-instagram/` seguem exatamente o contrato `Authorization: Bearer CRON_SECRET`.
  - Projeto não possui `next.config.js` custom nem Supabase Edge Functions ativos para agendamento.
  - Zero runtime/infra adicional; deploy atômico junto com o código.
- **Supabase pg_cron**: descartado — exige manter SQL versionado fora do repo Next, duplica segredos, e move lógica HTTP para banco.
- **Webhook externo (Upstash QStash, GitHub Actions)**: descartado por adicionar dependência nova sem ganho sobre Vercel Cron.

## Arquitetura

```
Vercel Cron (vercel.json)
   │
   ├── cron: "30 3 * * *" ──► POST /api/cron/loyalty/expire-points
   │                            ├── Auth: Bearer CRON_SECRET
   │                            ├── Gate: isFeatureEnabled("loyaltyProgram")
   │                            ├── ExpirationService.expirePoints(now)
   │                            └── ExpirationService.notifyExpiringPoints()
   │
   └── cron: "0 9 * * *"  ──► POST /api/cron/loyalty/birthday-bonuses
                                ├── Auth: Bearer CRON_SECRET
                                ├── Gate: isFeatureEnabled("loyaltyProgram")
                                └── BirthdayService.creditBirthdayBonuses(now)
```

Admin manual endpoints (`src/app/api/admin/loyalty/expire-points/route.ts:1-21`, `.../birthday-bonuses/route.ts:1-21`) permanecem intactos como fallback.

## Componentes

### 1. Route Handler: `src/app/api/cron/loyalty/expire-points/route.ts` (novo)

Contrato `POST`:

- Lê `Authorization` header, compara com `process.env.CRON_SECRET`
- Retorna `apiError("CONFIG_ERROR", "Cron secret não configurado", 500)` se env ausente
- Retorna `apiError("UNAUTHORIZED", "Não autorizado", 401)` se header inválido
- Consulta `isFeatureEnabled("loyaltyProgram")` via `src/services/feature-flags.ts`; se `false` retorna `apiSuccess({ skipped: true, reason: "loyaltyProgram disabled" })`
- Marca `t0 = performance.now()`
- `const result = await ExpirationService.expirePoints()`
- `await ExpirationService.notifyExpiringPoints()` (best-effort; erros já capturados internamente)
- Log `console.info("[loyalty-cron] expire-points", { ...result, durationMs })`
- Retorna `apiSuccess({ ...result, durationMs })`
- Try/catch envolve o bloco, delega erro via `handlePrismaError`

`GET` idêntico ao padrão de `src/app/api/cron/sync-instagram/route.ts:106-121`: 405 em produção, orientação em dev.

### 2. Route Handler: `src/app/api/cron/loyalty/birthday-bonuses/route.ts` (novo)

Mesmo esqueleto do item 1, trocando:

- `ExpirationService.expirePoints` → `BirthdayService.creditBirthdayBonuses`
- Sem chamada a `notifyExpiringPoints` (notificação já é inline em `birthday.service.ts:95-98`)
- Log key: `"[loyalty-cron] birthday-bonuses"`

### 3. Helper compartilhado: `src/app/api/cron/loyalty/_shared.ts` (novo)

Isolamento do boilerplate para evitar duplicação entre os dois endpoints e para facilitar teste unitário:

```ts
export type CronJobName = "expire-points" | "birthday-bonuses";

export async function runLoyaltyCron<T>(
  request: Request,
  jobName: CronJobName,
  job: () => Promise<T>,
): Promise<Response>;
```

Responsabilidades:
- Validação de `CRON_SECRET`
- Gate de `loyaltyProgram`
- Medição de `durationMs`
- Log estruturado
- Tratamento de erros com `handlePrismaError`

Cada route handler vira wrapper fino chamando `runLoyaltyCron`.

### 4. `vercel.json` (atualização)

```json
{
  "crons": [
    { "path": "/api/cron/sync-instagram", "schedule": "0 10 * * *" },
    { "path": "/api/cron/loyalty/expire-points", "schedule": "30 3 * * *" },
    { "path": "/api/cron/loyalty/birthday-bonuses", "schedule": "0 9 * * *" }
  ]
}
```

Horários em UTC; aniversário às 09:00 UTC ≈ 06:00 BRT (cliente acorda com notificação); expiração às 03:30 UTC ≈ 00:30 BRT (baixo tráfego).

### 5. Observabilidade

- Log estruturado em `console.info` com prefixo `[loyalty-cron]`, consumível em Vercel Logs
- Resposta HTTP inclui `durationMs` para rastrear performance
- Admin UI pode plotar histórico via novo campo opcional `PointTransaction.referenceId` filtrado por `type = EXPIRED` (análise existente, não requer schema change)

### 6. Gate de feature flag

Usa `isFeatureEnabled("loyaltyProgram")` de `src/services/feature-flags.ts:170-173`. Flag padrão `false` (ver `src/config/feature-flags.ts:17-23`); operação liga via admin UI (`src/components/admin/feature-flags/`) ou env `FEATURE_FLAG_LOYALTY_PROGRAM=true`.

### 7. Idempotência

Já garantida no banco: `@@unique([referenceId, type])` em `prisma/schema.prisma:466`. Logic reforça:
- `ExpirationService.getExpiredTransactions` filtra IDs já presentes em transações `EXPIRED` (`expiration.service.ts:30-46`)
- `BirthdayService.hasBirthdayBonusThisYear` checa `referenceId = "birthday-{year}"` antes de creditar (`birthday.service.ts:45-58`)

Qualquer retry do Vercel Cron é seguro.

### 8. Rate limit

Vercel Cron não sobrepõe execuções do mesmo path por default, mas mesmo em caso de execução concorrente (debug manual + cron) a constraint unique absorve. Não adicionar rate-limit no route handler para manter execução do admin manual sem bloqueios.

## Traceability

| Requisito | Componente(s) |
|-----------|---------------|
| 1.1, 1.5 | Route handler expire-points + `ExpirationService.expirePoints` |
| 1.2, 2.6 | Helper `runLoyaltyCron` — gate de feature flag |
| 1.3, 1.4 | `ExpirationService.getExpiredTransactions` (pré-existente) |
| 1.6 | Chamada explícita a `ExpirationService.notifyExpiringPoints` |
| 2.1, 2.2 | Route handler birthday-bonuses + `BirthdayService.creditBirthdayBonuses` |
| 2.3 | `BirthdayService.hasBirthdayBonusThisYear` (pré-existente) |
| 2.4 | `LoyaltyNotificationService.notifyBirthdayBonus` (pré-existente, chamado inline) |
| 2.5 | Try/catch dentro do loop em `birthday.service.ts:86-108` |
| 3.1, 3.2 | Helper `runLoyaltyCron` — validação de `CRON_SECRET` |
| 3.3 | Handler `GET` de cada route |
| 3.4, 3.5 | Log estruturado + `handlePrismaError` no helper |
| 3.6 | Constraint `@@unique([referenceId, type])` + filtros pré-existentes |
| 3.7 | Admin routes intactas em `src/app/api/admin/loyalty/` |
| 3.8 | `vercel.json` com dois novos entries |

## Decisões

- **Sem UI nova**: admin já tem botões manuais; dry-run out-of-scope para esta spec (pode virar spec `loyalty-ops-dashboard` depois)
- **Sem migration**: schema já suporta tudo (`@@unique`, `expiresAt`, `referenceId`)
- **Logger**: `console.info`/`console.error` consistente com o projeto; evolução para logger estruturado é transversal (não desta spec)
- **Timezone**: job roda em UTC; `birthday.service.ts` já usa `getUTCMonth/getUTCDate` corretamente
- **Falha silenciosa em notificação**: `notifyExpiringPoints` já captura erro por conta (`expiration.service.ts:163-168`); mantemos contrato
