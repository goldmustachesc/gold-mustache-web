# Plano de Implementação — loyalty-automation

Ordem TDD: teste falha → implementação → refactor. Itens marcados com `(P)` podem rodar em paralelo com outros `(P)` do mesmo grupo.

- [x] 1. Helper compartilhado `runLoyaltyCron`
  - [x] 1.1 Escrever teste: retorna 500 quando `CRON_SECRET` ausente
  - [x] 1.2 Escrever teste: retorna 401 quando header `Authorization` inválido
  - [x] 1.3 Escrever teste: retorna `{ skipped: true }` quando `loyaltyProgram` desabilitado
  - [x] 1.4 Escrever teste: invoca job e retorna `apiSuccess({ ...result, durationMs })` quando tudo ok
  - [x] 1.5 Escrever teste: converte exceção via `handlePrismaError`
  - [x] 1.6 Implementar `src/app/api/cron/loyalty/_shared.ts` com `runLoyaltyCron<T>()`
  - [x] 1.7 Garantir log `console.info("[loyalty-cron] {jobName}", payload)` em sucesso e `console.error` em falha
  _Requirements: 1.2, 2.6, 3.1, 3.2, 3.4, 3.5_

- [x] 2. Route handler: expire-points `(P)`
  - [x] 2.1 Escrever teste de integração da rota: POST autorizado chama `ExpirationService.expirePoints` e `notifyExpiringPoints`
  - [x] 2.2 Escrever teste: GET em produção retorna 405
  - [x] 2.3 Escrever teste: GET em dev retorna orientação de uso
  - [x] 2.4 Implementar `src/app/api/cron/loyalty/expire-points/route.ts` usando `runLoyaltyCron`
  - [x] 2.5 Verificar testes passam
  _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 3.3_

- [x] 3. Route handler: birthday-bonuses `(P)`
  - [x] 3.1 Escrever teste de integração da rota: POST autorizado chama `BirthdayService.creditBirthdayBonuses`
  - [x] 3.2 Escrever teste: flag desabilitada não invoca service
  - [x] 3.3 Escrever teste: GET em produção retorna 405
  - [x] 3.4 Implementar `src/app/api/cron/loyalty/birthday-bonuses/route.ts` usando `runLoyaltyCron`
  - [x] 3.5 Verificar testes passam
  _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.3_

- [x] 4. Configuração Vercel Cron
  - [x] 4.1 Atualizar `vercel.json` adicionando `/api/cron/loyalty/expire-points` com schedule `30 3 * * *`
  - [x] 4.2 Adicionar `/api/cron/loyalty/birthday-bonuses` com schedule `0 9 * * *`
  - [x] 4.3 Validar JSON parseia (schema Vercel)
  - [x] 4.4 Confirmar no dashboard Vercel após deploy de staging que os 3 crons aparecem
  _Requirements: 3.8_

- [x] 5. Smoke test e validação ponta-a-ponta
  - [x] 5.1 Seed manual: criar `PointTransaction` com `expiresAt` no passado em ambiente de staging
  - [x] 5.2 Disparar manualmente `curl -X POST .../api/cron/loyalty/expire-points -H "Authorization: Bearer $CRON_SECRET"`
  - [x] 5.3 Verificar criação de transação `EXPIRED` correspondente e decremento de `currentPoints`
  - [x] 5.4 Seed: profile com `birthDate` = hoje UTC
  - [x] 5.5 Disparar `/api/cron/loyalty/birthday-bonuses` e confirmar crédito `EARNED_BIRTHDAY`
  - [x] 5.6 Re-executar ambos e confirmar idempotência (nenhuma duplicação)
  _Requirements: 1.1, 2.1, 3.6, 3.7_

- [x] 6. Observabilidade e docs de ops `(P)`
  - [x] 6.1 Adicionar seção `docs/ops/loyalty-crons.md` com: horários, como disparar manual, como validar em Vercel Logs, como reverter (toggle da flag)
  - [x] 6.2 Documentar nomes de env vars requeridas (`CRON_SECRET`, `FEATURE_FLAG_LOYALTY_PROGRAM` opcional)
  - [x] 6.3 Linkar para `src/app/api/admin/loyalty/expire-points/route.ts` e `birthday-bonuses/route.ts` como fallback manual
  _Requirements: 3.4, 3.7_

- [x] 7. Gate final
  - [x] 7.1 `pnpm test` — sem regressão (2717 testes passando)
  - [x] 7.2 `pnpm lint` — Biome limpo
  - [x] 7.3 `pnpm build` — build passa
  - [x] 7.4 `pnpm test:gate` — coverage dentro do limite
  - [x] 7.5 Conventional Commit: `feat(loyalty): add cron automation for points expiration and birthday bonuses`
