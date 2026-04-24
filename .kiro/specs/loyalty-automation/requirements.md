# Documento de Requisitos — loyalty-automation

## Introdução

Automatizar a execução periódica dos fluxos de fidelidade que hoje dependem de disparo manual por admin: (1) expiração de pontos após `LOYALTY_CONFIG.POINTS_EXPIRY_MONTHS` e (2) concessão de `EARNED_BIRTHDAY` no aniversário do cliente. A lógica de domínio já existe em `src/services/loyalty/expiration.service.ts` e `src/services/loyalty/birthday.service.ts`; falta apenas o scheduler e o endpoint protegido. P0 da auditoria 2026-04-15 (`docs/auditoria-projeto-2026-04-15.md`), bloqueador para elevar a nota de Fidelidade de 7.0 para 9.0.

## Glossário

- **Cron_Runner**: Scheduler externo (Vercel Cron, configurado em `vercel.json`) que dispara HTTP POST autenticado para endpoints `/api/cron/*`
- **Cron_Endpoint**: Route Handler Next.js em `src/app/api/cron/loyalty/**` protegido por `CRON_SECRET`
- **Expiration_Job**: Execução de `ExpirationService.expirePoints()` sobre transações com `expiresAt <= now`
- **Birthday_Job**: Execução de `BirthdayService.creditBirthdayBonuses()` sobre profiles com `birthDate` do dia
- **Feature_Flag_Loyalty**: Flag `loyaltyProgram` em `src/config/feature-flags.ts`; governa se qualquer crédito/débito de pontos deve ocorrer
- **Cron_Secret**: Variável de ambiente `CRON_SECRET` usada no header `Authorization: Bearer <secret>` (padrão de `src/app/api/cron/cleanup-guests/route.ts` e `sync-instagram/route.ts`)
- **Idempotência_Referência**: Constraint `@@unique([referenceId, type])` em `prisma/schema.prisma:466` que impede duplicação de transações com mesmo `referenceId` e mesmo `type`

## Requisitos

### Requisito 1 — Cron de expiração de pontos

**User Story:** Como operador do programa de fidelidade, quero que pontos expirem automaticamente todo dia após a data configurada, para que o saldo dos clientes reflita a política `POINTS_EXPIRY_MONTHS` sem intervenção manual.

#### Critérios de Aceitação

1. WHEN o Cron_Runner dispara `POST /api/cron/loyalty/expire-points` uma vez por dia THEN o Cron_Endpoint SHALL invocar `ExpirationService.expirePoints(new Date())` e retornar `{ processedCount, totalPointsExpired, affectedAccounts }` em formato `apiSuccess`
2. WHEN a Feature_Flag_Loyalty estiver desabilitada THEN o Cron_Endpoint SHALL retornar `apiSuccess({ skipped: true, reason: "loyaltyProgram disabled" })` com status 200 sem invocar o service
3. WHEN uma PointTransaction com `expiresAt <= now`, `points > 0` e `type` em `EXPIRABLE_TYPES` existir THEN o Expiration_Job SHALL criar uma transação `EXPIRED` com `points = -original` e `referenceId = original.id`
4. WHEN o Expiration_Job já criou uma transação `EXPIRED` para um `referenceId` em execução anterior THEN o job SHALL ignorar o candidato (filtro já implementado em `expiration.service.ts:30-46`)
5. WHEN múltiplas transações expiradas pertencerem ao mesmo `loyaltyAccountId` THEN o Expiration_Job SHALL agrupar e decrementar `currentPoints` em uma única transação Prisma com `Math.min(sumExpired, currentPoints)` (comportamento já em `expiration.service.ts:71-102`)
6. WHEN existirem transações com `expiresAt` entre `now` e `now + EXPIRY_WARNING_DAYS` THEN o Expiration_Job SHALL invocar `ExpirationService.notifyExpiringPoints()` para notificar clientes via `LoyaltyNotificationService.notifyPointsExpiring`

### Requisito 2 — Cron de bônus de aniversário

**User Story:** Como cliente cadastrado com `birthDate` definido, quero receber `LOYALTY_CONFIG.BIRTHDAY_BONUS` pontos automaticamente no dia do meu aniversário, para perceber valor contínuo do programa.

#### Critérios de Aceitação

1. WHEN o Cron_Runner dispara `POST /api/cron/loyalty/birthday-bonuses` uma vez por dia THEN o Cron_Endpoint SHALL invocar `BirthdayService.creditBirthdayBonuses(new Date())` e retornar `{ processedCount, totalPointsCredited, failedCount }`
2. WHEN o Profile tiver `birthDate.getUTCMonth()` e `getUTCDate()` iguais aos do dia de execução E existir `loyaltyAccount` associado THEN o Birthday_Job SHALL creditar `LOYALTY_CONFIG.BIRTHDAY_BONUS` pontos com `type = EARNED_BIRTHDAY` e `referenceId = "birthday-{year}"`
3. WHEN já existir PointTransaction com `type = EARNED_BIRTHDAY` e `referenceId = "birthday-{year}"` para o mesmo `loyaltyAccountId` THEN o Birthday_Job SHALL não creditar novamente (comportamento já em `birthday.service.ts:45-58`)
4. WHEN o crédito for bem-sucedido THEN o Birthday_Job SHALL invocar `LoyaltyNotificationService.notifyBirthdayBonus(profileId, BIRTHDAY_BONUS)` para notificar o cliente
5. WHEN o crédito falhar para um profile específico THEN o Birthday_Job SHALL capturar a exceção, incrementar `failedCount`, logar via `console.error` e continuar processando os demais profiles
6. WHEN a Feature_Flag_Loyalty estiver desabilitada THEN o Cron_Endpoint SHALL retornar `apiSuccess({ skipped: true, reason: "loyaltyProgram disabled" })` sem invocar o service

### Requisito 3 — Segurança, observabilidade e operabilidade

**User Story:** Como time de operações, quero que os endpoints de cron sejam protegidos, observáveis e auditáveis, para evitar execução não autorizada, duplicada ou silenciosa.

#### Critérios de Aceitação

1. WHEN uma requisição chegar ao Cron_Endpoint sem header `Authorization: Bearer <CRON_SECRET>` THEN o endpoint SHALL retornar `apiError("UNAUTHORIZED", "Não autorizado", 401)` (padrão de `src/app/api/cron/cleanup-guests/route.ts:20-30`)
2. WHEN `process.env.CRON_SECRET` estiver indefinido THEN o Cron_Endpoint SHALL retornar `apiError("CONFIG_ERROR", "Cron secret não configurado", 500)` e NÃO executar o job
3. WHEN `process.env.NODE_ENV === "production"` E o método for `GET` THEN o endpoint SHALL retornar `apiError("METHOD_NOT_ALLOWED", "Método não permitido em produção", 405)`; em desenvolvimento `GET` SHALL responder com instrução de uso (padrão de `sync-instagram/route.ts:106-121`)
4. WHEN o job completar com sucesso THEN o endpoint SHALL logar em `console.info` (ou logger estruturado equivalente) com formato `[loyalty-cron] {jobName} processedCount={n} totalPoints={n} durationMs={n}` para rastreamento em Vercel Logs
5. WHEN o job lançar exceção não tratada THEN o endpoint SHALL retornar via `handlePrismaError` e logar stack trace, sem expor detalhes ao caller (mesmo Cron_Runner)
6. WHEN o mesmo job for disparado em janelas sobrepostas (retry do Vercel Cron) THEN a Idempotência_Referência SHALL garantir que nenhum crédito/débito seja duplicado
7. WHEN admin quiser disparar o job manualmente fora do cron THEN os endpoints existentes em `src/app/api/admin/loyalty/expire-points/route.ts` e `.../birthday-bonuses/route.ts` SHALL permanecer funcionais (fallback manual)
8. WHEN o schedule estiver configurado em `vercel.json` THEN a frequência SHALL ser diária para ambos os jobs, em horário de baixo tráfego (sugerido: `30 3 * * *` para expiração, `0 9 * * *` para aniversário — UTC)
