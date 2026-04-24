# Documento de Requisitos

## Introducao

A area Admin atualmente nao possui nenhuma tela para gestao de clientes. Operacoes de CRM (localizar cliente, ver historico, identificar inativos, banir/desbanir) dependem de queries manuais no banco ou acessos cruzados pelo painel do barbeiro. Esta feature entrega o modulo `admin/clientes` consolidando `Profile`, `GuestClient`, `BannedClient`, `LoyaltyAccount`, `Appointment`, `Feedback` em uma UI unica, com busca, filtros, detalhe completo e exportacao CSV compativel com LGPD.

Referencia: auditoria 2026-04-15 — P1 #6 (Admin: nota 5.5 -> 7.5). Feature complementa `admin-appointment-management` (P0 #2) e integra com audit log previsto em `loyalty-bugfix-audit`.

## Glossario

- **Cliente ativo:** `Profile` ou `GuestClient` com ao menos 1 `Appointment` em `CONFIRMED` ou `COMPLETED` nos ultimos 30 dias.
- **Cliente inativo:** sem appointments em `CONFIRMED`/`COMPLETED` ha >= N dias (parametros 30/60/90).
- **Guest cliente:** registro `GuestClient` ainda nao vinculado a `Profile` via `claimedByProfileId`.
- **Audit log:** registro imutavel de acao administrativa (quem, quando, o que, antes/depois), integrado ao modelo definido em `loyalty-bugfix-audit`.
- **Campo sensivel LGPD:** email completo, telefone completo, endereco, data de nascimento, CPF (quando existir), notas internas.

## Requisitos

### Requisito 1 — Listagem paginada com busca

**User story:** Como administrador, quero listar clientes com busca por nome, email ou telefone para localizar rapidamente um cliente especifico.

1. A rota `GET /api/admin/clientes` SHALL exigir sessao admin valida via `requireAdmin`.
2. A resposta SHALL retornar paginacao server-side com `page`, `pageSize` (default 20, max 100) e `total`.
3. A query `q` (string, min 2 chars) SHALL fazer busca case-insensitive em `Profile.fullName`, `Profile.phone`, email do `auth.users` (Supabase) e `GuestClient.fullName`/`GuestClient.phone`.
4. A listagem SHALL unificar `Profile` e `GuestClient` (nao-claimed) em uma unica colecao com campo discriminador `type: "registered" | "guest"`.
5. Cada item da listagem SHALL incluir: `id`, `type`, `fullName`, `phone` (mascarado para logs, completo na UI), `email` (apenas para registered), `role` (apenas para registered), `createdAt`, `lastAppointmentAt`, `totalAppointments`, `loyaltyTier` (quando aplicavel), `isBanned` (boolean).
6. A listagem SHALL ordenar por `lastAppointmentAt DESC NULLS LAST` por padrao, com opcoes `fullName ASC`, `createdAt DESC`.
7. A UI em `/admin/clientes` SHALL exibir DataTable responsivo com busca debounce 300ms, paginacao e indicador de loading.

### Requisito 2 — Filtros avancados

**User story:** Como administrador, quero aplicar filtros na listagem para segmentar clientes por status, atividade e fidelidade.

1. A rota `GET /api/admin/clientes` SHALL aceitar filtros combinaveis:
   1. `status`: `"active" | "inactive"` (usa threshold 30 dias quando `inactiveDays` nao informado).
   2. `banned`: `"true" | "false"`.
   3. `type`: `"registered" | "guest"`.
   4. `loyaltyTier`: `"BRONZE" | "SILVER" | "GOLD" | "DIAMOND"` (aplica-se apenas a registered).
   5. `createdFrom` / `createdTo`: ISO date range.
   6. `inactiveDays`: `30 | 60 | 90` (usado quando `status=inactive`).
2. Filtros SHALL ser validados via schema Zod no route handler; erro 400 com mensagem localizada quando invalido.
3. A UI SHALL renderizar painel de filtros (drawer ou sidebar) com contadores por filtro aplicado e botao "Limpar filtros".
4. O conjunto de filtros aplicados SHALL ser persistido na query string (shareable URL).

### Requisito 3 — Detalhe do cliente com abas

**User story:** Como administrador, quero ver o historico completo de um cliente em uma unica tela para atendimento informado.

1. A rota `GET /api/admin/clientes/[id]` SHALL aceitar `id` de `Profile` OU `GuestClient` e inferir tipo.
2. A resposta SHALL incluir: dados basicos, `BannedClient` (se existir), `LoyaltyAccount` completo (com `currentPoints`, `lifetimePoints`, `tier`, `referralCode`), contadores (`appointments.total`, `appointments.completed`, `appointments.cancelled`, `appointments.noShow`, `feedbacks.total`, `feedbacks.avgRating`).
3. A UI em `/admin/clientes/[id]` SHALL organizar o detalhe em abas:
   1. **Visao geral** — dados basicos, contadores, status (ativo/inativo/banido).
   2. **Agendamentos** — lista paginada de `Appointment` com barbeiro, servico, status, data; link para `/admin/agendamentos/[id]` quando disponivel.
   3. **Feedbacks** — lista de `Feedback` com rating, comentario, data, barbeiro.
   4. **Fidelidade** — saldo, tier, transacoes recentes (`PointTransaction`), redempcoes (`Redemption`).
   5. **Notas internas** — campo `notes` (texto livre) editavel apenas por admin. Historico de mudancas via audit log.
4. A aba "Notas internas" SHALL persistir em novo campo `Profile.adminNotes` e `GuestClient.adminNotes` (nullable text) — coberto no design.
5. A rota `PATCH /api/admin/clientes/[id]/notes` SHALL gravar a nota e emitir audit log.
6. Guest clients claimed SHALL exibir badge "Conta vinculada" apontando para o `Profile` resultante.

### Requisito 4 — Edicao de dados basicos

**User story:** Como administrador, quero editar dados basicos de um cliente (nome, telefone, endereco) para corrigir cadastro.

1. A rota `PATCH /api/admin/clientes/[id]` SHALL aceitar campos: `fullName`, `phone`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `zipCode`, `birthDate`.
2. Edicao de email SHALL NOT ser permitida (email e gerido pelo Supabase Auth).
3. Edicao de `role` SHALL NOT ser permitida nesta rota (gestao de roles fica em spec dedicada).
4. Validacao SHALL usar schemas Zod reutilizados de `profile.ts` quando existirem; caso contrario criar schema dedicado.
5. Toda edicao SHALL emitir audit log com diff antes/depois.
6. Para `GuestClient`, somente `fullName` e `phone` SHALL ser editaveis.

### Requisito 5 — Relatorio de clientes inativos

**User story:** Como administrador, quero listar clientes que nao agendam ha 30/60/90 dias para campanhas de reativacao.

1. A rota `GET /api/admin/clientes/inactive?days=30|60|90` SHALL retornar clientes sem `Appointment` em `CONFIRMED`/`COMPLETED` cuja `date >= now - days`.
2. A resposta SHALL incluir `lastAppointmentAt`, `daysSinceLast`, `totalLifetimeAppointments` e contato (phone/email) para follow-up.
3. A rota SHALL aceitar paginacao (`page`, `pageSize`) e export CSV (`format=csv`).
4. Clientes banidos SHALL ser excluidos do relatorio por default; parametro `includeBanned=true` opcional.
5. A UI SHALL exibir card/tabela com 3 presets (30/60/90 dias) e acao "Exportar CSV".

### Requisito 6 — Export CSV LGPD-safe

**User story:** Como administrador, quero exportar clientes em CSV para acoes externas respeitando LGPD.

1. A rota `GET /api/admin/clientes/export.csv` SHALL aceitar os mesmos filtros de `/api/admin/clientes` e gerar CSV streaming.
2. O CSV default SHALL incluir apenas: `id`, `type`, `fullName`, `city`, `state`, `createdAt`, `lastAppointmentAt`, `totalAppointments`, `loyaltyTier`.
3. Campos sensiveis (`email`, `phone`, `birthDate`, endereco completo, `adminNotes`) SHALL ser incluidos APENAS quando o admin enviar `includeSensitive=true` E declarar uma `justification` (min 10 chars) que SHALL ser gravada em audit log.
4. O CSV SHALL usar separador `;` e encoding UTF-8 BOM para compatibilidade com Excel pt-BR.
5. O header da resposta SHALL incluir `Content-Disposition: attachment; filename="clientes-YYYY-MM-DD.csv"`.
6. Exports SHALL ser rate-limited (max 10/hora por admin) usando `src/lib/rate-limit.ts`.
7. Todo export SHALL emitir audit log com: adminId, filtros aplicados, `includeSensitive`, `justification`, count de linhas.

### Requisito 7 — Ban / Unban via UI

**User story:** Como administrador, quero banir ou desbanir um cliente a partir da tela de detalhe para agilizar a moderacao.

1. A rota `POST /api/admin/clientes/[id]/ban` SHALL reutilizar `src/services/banned-client.ts::banClient` e aceitar `reason` (opcional, max 500 chars).
2. A rota `DELETE /api/admin/clientes/[id]/ban` SHALL reutilizar `banned-client.ts::unbanClient`.
3. Ban via admin SHALL usar `bannedBy` do barbeiro default configurado (ou novo campo `BannedClient.bannedByAdminId` — decidir em design); NAO pode ser `null`.
4. A UI SHALL exibir confirmacao modal com `reason` obrigatoria e feedback toast apos sucesso/erro.
5. Ambas as operacoes SHALL emitir audit log (`action: "client.ban" | "client.unban"`).
6. O ban via UI SHALL invalidar cache da listagem (revalidar rota `/admin/clientes`).

### Requisito 8 — Audit log das acoes admin

**User story:** Como administrador responsavel pela LGPD, quero rastrear todas as acoes de gestao de clientes para conformidade.

1. Todas as rotas mutativas (`PATCH notes`, `PATCH profile`, `POST ban`, `DELETE ban`, `GET export.csv`, `GET /clients/[id]` quando `includeSensitive=true`) SHALL emitir registro no modelo de audit log definido em `loyalty-bugfix-audit`.
2. Cada registro SHALL incluir: `adminProfileId`, `action`, `targetType` (`profile` | `guest_client`), `targetId`, `before` (JSON), `after` (JSON), `metadata` (filtros, justificativa, ip, userAgent), `createdAt`.
3. Emails e CPFs presentes em `before`/`after` SHALL ser mascarados (regra: primeira letra + `***` + dominio / primeiros 3 digitos + `***` + ultimos 2).
4. A UI SHALL exibir aba "Historico admin" no detalhe do cliente mostrando audit logs relacionados (somente leitura).
5. Caso o modelo de audit log de `loyalty-bugfix-audit` nao esteja pronto, esta spec SHALL assumir dependencia e NAO bloquear deploy (feature flag `adminAuditLog.enabled` — fallback para log estruturado em `console.info`).

### Requisito 9 — Guest lookup por telefone

**User story:** Como administrador, quero localizar um guest pelo telefone para reconciliar com um cliente existente.

1. A rota `GET /api/admin/clientes?q=<phone>` SHALL normalizar telefone (remover nao-digitos, ignorar DDI 55) antes de fazer match contra `GuestClient.phone` e `Profile.phone`.
2. Quando o telefone bate com `GuestClient` nao-claimed E existe `Profile` com mesmo telefone, a UI SHALL sugerir acao "Vincular guest ao cliente".
3. A UI no detalhe de guest SHALL exibir CTA "Vincular a cliente registrado" que dispara a logica de claim manual.

### Requisito 10 — Merge manual de guest appointments

**User story:** Como administrador, quero anexar appointments de um guest a um Profile existente quando o cliente cria conta posterior.

1. A rota `POST /api/admin/clientes/[profileId]/claim-guest` SHALL aceitar `guestClientId` e validar:
   1. Guest existe e NAO esta `claimedAt`.
   2. `Profile` existe e NAO esta banido (caso contrario warning).
2. A operacao SHALL reutilizar o pipeline de claim existente (procurar em `src/services/guest-linking.ts`) em uma transacao:
   1. Atualizar `GuestClient.claimedByProfileId` e `claimedAt`.
   2. Reatribuir `Appointment.clientId` e `Feedback.clientId` quando aplicavel (baseado em `guestClientId`).
   3. Migrar `BannedClient` do guest para profile via `migrateGuestBanToProfile`.
3. A operacao SHALL emitir audit log com counts de appointments e feedbacks migrados.
4. A UI SHALL exibir confirmacao modal com resumo do impacto (quantos agendamentos/feedbacks) antes de confirmar.

### Requisito 11 — Indices de banco e performance

**User story:** Como mantenedor, quero que as queries de listagem e filtros nao causem full table scan.

1. A spec SHALL verificar/adicionar indices Prisma necessarios:
   1. `Profile.fullName` — indice para busca ILIKE (solucao: `@@index([fullName])` ou coluna `gin_trgm` via migration SQL).
   2. `Profile.phone` — indice btree (ja util para lookup).
   3. `GuestClient.fullName` — indice btree para ordenacao.
   4. `Appointment.date, Appointment.clientId, Appointment.status` — indice composto ja existe parcialmente; revisar.
2. Queries de `lastAppointmentAt` SHALL usar subquery ou `groupBy` — documentar no design.
3. Export CSV SHALL usar `findMany` com `take` limitado (ex: 5000) + streaming; acima do limite exigir filtros adicionais.

### Requisito 12 — i18n e acessibilidade

**User story:** Como usuario admin pt-BR, quero toda a UI traduzida e acessivel.

1. Todas as strings SHALL estar em `messages/pt-BR.json` (namespace `admin.clients`); chaves em `en.json` e `es.json` SHALL ser criadas como fallback.
2. DataTable SHALL ter navegacao por teclado, headers com `scope="col"`, live region anunciando "X resultados".
3. Formularios SHALL usar labels associados (`<Label htmlFor>`), validacao anunciada por aria-live, focus management em modais.
4. Cores/badges SHALL seguir tokens em `globals.css` (light + dark mode).

### Requisito 13 — Seguranca

**User story:** Como mantenedor, quero que a feature siga as regras de seguranca do projeto.

1. Todas as rotas SHALL verificar `requireAdmin` e `requireValidOrigin` (quando mutativas).
2. Responses SHALL nao expor stack traces; usar `handlePrismaError`.
3. Queries SHALL usar `select`/`include` minimos (Regra de seguranca do projeto).
4. Logs SHALL mascarar email/telefone/CPF (helper dedicado em `src/lib/auth/sanitize.ts` ou novo `src/lib/privacy/mask.ts`).
5. Proibido `any`. TypeScript obrigatorio. Imports com alias `@/`.
