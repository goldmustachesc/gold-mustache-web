# Documento de Requisitos — loyalty-bugfix-audit

## Introdução

Bundle corretivo P2 da auditoria 2026-04-15 (`docs/auditoria-projeto-2026-04-15.md`, itens #10, #11, #15) agrupando quatro bugs do módulo de Fidelidade e a introdução de log estruturado para ações administrativas. Escopo: (a) `markAppointmentAsNoShow` aplica penalidade de pontos sem verificar a feature flag `loyaltyProgram`; (b) extrato de pontos do cliente usa `getTypeIcon` que compara com `"EARNED"` e `"ADJUSTED_ADD"`, valores que não existem no enum `PointTransactionType`; (c) `EARNED_CHECKIN` não consta em `EXPIRABLE_TYPES` (`src/services/loyalty/expiration.service.ts:7-13`), logo 20 pontos de check-in nunca expiram apesar da política de `POINTS_EXPIRY_MONTHS`; (d) a UI de referral apresenta o mesmo valor de bônus para indicante e indicado, enquanto o service credita `REFERRAL_BONUS` (150) para o indicante e `FIRST_APPOINTMENT_BONUS` (50) para o indicado (`src/services/loyalty/referral.service.ts:92-132`); (e) rotas admin (`src/app/api/admin/loyalty/rewards/**`) registram ações via `console.info("[AUDIT] ...")` sem persistência, inviabilizando auditoria retroativa. Objetivo: fechar os bugs, alinhar UI ↔ regra de negócio e criar trilha de auditoria persistente com UI de consulta.

## Glossário

- **Feature_Flag_Loyalty**: flag `loyaltyProgram` lida por `isFeatureEnabled("loyaltyProgram")` de `src/services/feature-flags.ts`
- **PointTransactionType_Enum**: enum Prisma em `prisma/schema.prisma:417-428` com valores `EARNED_APPOINTMENT`, `EARNED_REFERRAL`, `EARNED_REVIEW`, `EARNED_CHECKIN`, `EARNED_BIRTHDAY`, `EARNED_BONUS`, `REDEEMED`, `EXPIRED`, `ADJUSTED`, `PENALTY_NO_SHOW`
- **EXPIRABLE_TYPES**: constante em `src/services/loyalty/expiration.service.ts:7-13` que lista os tipos elegíveis à rotina `ExpirationService.expirePoints`
- **AdminAuditLog**: novo modelo Prisma que persiste toda ação administrativa sensível (criação/edição/exclusão/toggle/ajuste manual)
- **Admin_Actor**: usuário com `profile.role = ADMIN` autenticado via `requireAdmin()` (`src/lib/auth/requireAdmin.ts`)
- **Audit_Payload**: JSON contendo o diff relevante da ação; PII do cliente (telefone, e-mail, documento, CEP) SHALL ser mascarada antes da persistência (LGPD)
- **Audit_UI**: página admin `/admin/auditoria` (locale-aware) com listagem paginada e filtros

## Requisitos

### Requisito 1 — Gate de feature flag em `markAppointmentAsNoShow`

**User Story:** Como operador, quero que a penalidade de pontos por no-show respeite a flag `loyaltyProgram`, para não penalizar clientes quando o programa está desligado.

#### Critérios de Aceitação

1. WHEN `markAppointmentAsNoShow` marcar um agendamento como `NO_SHOW` E `isFeatureEnabled("loyaltyProgram")` retornar `false` THEN o serviço SHALL retornar o agendamento atualizado sem invocar `LoyaltyService.penalizePoints`
2. WHEN `isFeatureEnabled("loyaltyProgram")` retornar `true` THEN o serviço SHALL manter o comportamento atual (`src/services/booking.ts:1600-1622`): cálculo de `calculateAppointmentPoints(price, tier)` e chamada a `penalizePoints`
3. WHEN a leitura da flag lançar exceção THEN o serviço SHALL capturar o erro, logar via `console.error` e prosseguir sem penalidade (degradação segura idêntica ao bloco de `markAppointmentAsCompleted` em `src/services/booking.ts:1721-1725`)
4. WHEN a flag estiver desligada THEN nenhuma `PointTransaction` de tipo `PENALTY_NO_SHOW` SHALL ser criada para aquele `appointmentId`

### Requisito 2 — Mapeamento correto de ícones/labels no extrato de pontos

**User Story:** Como cliente, quero ver no extrato um ícone e rótulo coerentes com o tipo real da transação, para entender a origem de cada movimentação.

#### Critérios de Aceitação

1. WHEN o extrato renderizar uma linha cujo `type` é `EARNED_APPOINTMENT`, `EARNED_REFERRAL`, `EARNED_REVIEW`, `EARNED_CHECKIN`, `EARNED_BIRTHDAY`, `EARNED_BONUS` ou `ADJUSTED` com `points > 0` THEN `getTypeIcon` SHALL retornar o ícone `ArrowUpRight` com classe `text-success`
2. WHEN o extrato renderizar uma linha cujo `type` é `REDEEMED`, `EXPIRED`, `PENALTY_NO_SHOW` ou `ADJUSTED` com `points < 0` THEN `getTypeIcon` SHALL retornar o ícone `ArrowDownRight` com classe `text-destructive`
3. WHEN o extrato renderizar qualquer linha THEN `getTypeLabel` SHALL resolver o rótulo via chave i18n correspondente a cada valor do `PointTransactionType_Enum` em `src/i18n/locales/{pt-BR,en,es}/loyalty.json > history.types`
4. WHEN o tipo recebido não constar no enum (defensivo) THEN a UI SHALL retornar o próprio valor cru do `type` como fallback e logar warning via `console.warn`
5. WHEN o teste unitário cobrir todos os valores do enum THEN o snapshot de ícone/label SHALL bater exatamente com o contrato acima

### Requisito 3 — Inclusão de `EARNED_CHECKIN` em `EXPIRABLE_TYPES`

**User Story:** Como operador do programa de fidelidade, quero que pontos de check-in expirem junto com os demais ganhos, para manter coerência com a política `POINTS_EXPIRY_MONTHS`.

#### Critérios de Aceitação

1. WHEN a constante `EXPIRABLE_TYPES` em `src/services/loyalty/expiration.service.ts` for avaliada THEN ela SHALL incluir `EARNED_CHECKIN` além dos 5 valores atuais
2. WHEN `ExpirationService.expirePoints` processar um lote contendo uma transação `EARNED_CHECKIN` com `expiresAt <= now` E sem transação `EXPIRED` correspondente THEN ela SHALL gerar uma `EXPIRED` espelho com `points = -original.points` e `referenceId = original.id`
3. WHEN `ExpirationService.getExpiringTransactions(warningDays)` for chamado THEN ele SHALL incluir `EARNED_CHECKIN` no resultado (mesmo filtro via `in: EXPIRABLE_TYPES`)
4. WHEN a rotina de crédito criar uma transação `EARNED_CHECKIN` THEN ela SHALL preencher `expiresAt = addMonths(now, POINTS_EXPIRY_MONTHS)` (comportamento depende de `LoyaltyService.creditPoints`, já presente em `src/services/loyalty/loyalty.service.ts:100-103`)

### Requisito 4 — Bônus de referral exibido corretamente na UI

**User Story:** Como cliente navegando em `/loyalty/referral`, quero ver com clareza quanto ganho ao indicar e quanto o indicado ganha no primeiro agendamento, para ter expectativa fiel.

#### Critérios de Aceitação

1. WHEN a página `/loyalty/referral` renderizar a descrição THEN ela SHALL mostrar dois valores distintos: `REFERRAL_BONUS` (150) para o indicante e `FIRST_APPOINTMENT_BONUS` (50) para o indicado, alinhado ao crédito efetivo em `ReferralService.creditReferralBonus` (`src/services/loyalty/referral.service.ts:92-132`)
2. WHEN um cliente validar e confirmar um código THEN a UI SHALL exibir mensagem "Você ganhará {FIRST_APPOINTMENT_BONUS} pontos após seu primeiro agendamento" (não o valor do indicante)
3. WHEN o indicante visualizar o próprio código THEN a UI SHALL exibir "Você ganha {REFERRAL_BONUS} pontos quando o amigo completar o primeiro agendamento"
4. WHEN as chaves i18n forem consultadas THEN os arquivos `src/i18n/locales/{pt-BR,en,es}/loyalty.json > referral` SHALL expor chaves separadas para `bonusReferrer` e `bonusReferred`, substituindo a chave única `description` que hoje concatena um único `{points}`
5. WHEN a constante `LOYALTY_CONFIG` for alterada (ex.: mudança de valores) THEN a UI SHALL refletir automaticamente, sem literais duplicados

### Requisito 5 — Persistência estruturada de log de auditoria admin

**User Story:** Como responsável por compliance, quero trilha de auditoria persistente para toda ação administrativa sensível, para atender LGPD e investigar incidentes.

#### Critérios de Aceitação

1. WHEN qualquer rota sob `src/app/api/admin/**` classificada como "ação sensível" (criação, atualização, exclusão, toggle de flag, ajuste manual de pontos, aprovação/rejeição) completar com `status >= 200 && status < 300` THEN o sistema SHALL persistir um registro em `AdminAuditLog` com os campos `id`, `actorId` (referência a `Profile.id`), `action` (string tipada via enum `AdminAuditAction`), `resourceType`, `resourceId` (nullable para ações em coleção), `payload` (Json), `ip` (nullable), `userAgent` (nullable), `createdAt`
2. WHEN o request incluir headers `x-forwarded-for` ou `user-agent` THEN eles SHALL ser persistidos respectivamente em `ip` (primeiro IP da lista) e `userAgent`; ausência → `null`
3. WHEN o `payload` contiver PII (chaves `phone`, `email`, `document`, `cpf`, `cnpj`, `rg`, `zipCode`, `birthDate`, `password`) THEN o serviço de audit SHALL mascará-las (substituir por `"[REDACTED]"`) antes da persistência
4. WHEN a gravação do log falhar THEN o endpoint original SHALL continuar retornando o sucesso da operação principal E o erro do audit SHALL ser logado via `console.error` sem interromper a requisição
5. WHEN `AdminAuditLog` completar 90 dias THEN ele SHALL permanecer consultável (retenção mínima); rotina de expurgo fora de escopo, mas schema SHALL possibilitar futuro cron sem alteração de modelo
6. WHEN a operação for chamada por usuário não admin (caminho raro via bypass) THEN o log NÃO SHALL ser gravado (audit pressupõe actor admin válido de `requireAdmin()`)
7. WHEN uma mesma operação envolver múltiplas mutations em transação Prisma THEN o log SHALL ser emitido uma única vez após o commit bem-sucedido
8. WHEN a auditoria for introduzida THEN os quatro pontos atuais de `console.info("[AUDIT] ...")` em `src/app/api/admin/loyalty/rewards/**` SHALL ser substituídos pela nova infraestrutura, sem perda informacional

### Requisito 6 — UI admin `/admin/auditoria` com filtros e paginação

**User Story:** Como admin, quero consultar o histórico de ações em uma lista filtrável, para investigar incidentes e revisar atividade de outros admins.

#### Critérios de Aceitação

1. WHEN admin acessar `/{locale}/admin/auditoria` THEN a página SHALL renderizar uma tabela com colunas: Data/Hora, Admin (nome), Ação, Recurso, ID do Recurso, IP (últimos 2 octetos mascarados), link "ver payload"
2. WHEN a lista renderizar THEN ela SHALL suportar paginação (padrão 50/página) via query params `?page=N&pageSize=N`, com navegação previous/next e contador total
3. WHEN admin aplicar filtros THEN a query SHALL aceitar combinações de `from` (ISO date), `to` (ISO date), `adminId` (cuid), `action` (enum), `resourceType` (string) — todos opcionais, combinados via `AND`
4. WHEN admin clicar em "ver payload" THEN o sistema SHALL abrir um modal com JSON formatado (`<pre>`) já com PII mascarada conforme Requisito 5.3
5. WHEN usuário não-admin acessar a rota THEN o layout SHALL redirecionar via `requireAdmin()` existente, retornando 403 (mesmo padrão das demais rotas admin)
6. WHEN a tabela estiver vazia para os filtros selecionados THEN ela SHALL mostrar empty state "Nenhum registro encontrado para os filtros selecionados"
7. WHEN os filtros forem alterados THEN a URL SHALL refletir o estado (deep link) e o reset SHALL estar disponível em um botão "Limpar filtros"
8. WHEN exportação CSV for solicitada (fora de escopo desta spec) THEN o endpoint de listagem SHALL estar pronto para suportar, mas o botão NÃO SHALL ser incluído nesta entrega
