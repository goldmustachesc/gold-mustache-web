# Requirements Document - Admin Appointment Management

## Introduction

Hoje o admin da Gold Mustache nao tem visao operacional do dia: cada barbeiro visualiza apenas os proprios agendamentos na area `src/app/[locale]/(protected)/admin/barbeiros/[id]/horarios/`, mas o admin nao consegue ver a agenda consolidada da barbearia, nem criar/cancelar/reagendar agendamentos em nome de clientes quando o telefone toca.

Esta feature entrega ao admin:

1. Uma tela de listagem com filtros e busca de todos os agendamentos;
2. Criacao manual de agendamento em nome de cliente (autenticado via `Profile` ou guest via `GuestClient`);
3. Cancelamento administrativo com bypass da janela de 2h e notificacao do cliente/barbeiro;
4. Reagendamento (dependente da spec `booking-reschedule` para a logica de mudanca de data/horario);
5. Calendario consolidado diario/semanal com todos os barbeiros lado a lado;
6. Paginacao e performance adequadas para volumes grandes.

Esta feature NAO duplica logica de `src/services/booking.ts`; apenas adiciona uma camada admin (`src/services/admin/appointments.ts`) que orquestra as operacoes existentes com permissoes de admin.

Fonte no backlog priorizado: auditoria `docs/auditoria-projeto-2026-04-15.md` — P0 #2 (visao admin) e P0 #4 (criacao/cancelamento admin), juntados. Impacto na area admin: nota 5.5 -> 7.5.

## Glossary

- **Admin**: usuario com `Profile.role = ADMIN` autenticado via Supabase (ver `src/lib/auth/requireAdmin.ts:19`).
- **Appointment**: registro da tabela `appointments` (ver `prisma/schema.prisma:208`). Pode ter `clientId` (cliente autenticado) OU `guestClientId` (guest), nunca os dois.
- **Admin_Appointment_Service**: nova camada em `src/services/admin/appointments.ts` que orquestra `src/services/booking.ts` com privilegios elevados.
- **Consolidated_Calendar**: grade diaria/semanal com barbeiros em colunas e slots em linhas, agregando todos os barbeiros ativos.
- **Admin_Cancellation_Bypass**: cancelamento que ignora `CANCELLATION_BLOCKED` (janela de 2h em `src/services/booking.ts:1353`), liberado apenas para admin com motivo obrigatorio.
- **Guest_Client**: cliente sem conta Supabase, registrado em `GuestClient`.
- **Traceability**: mapeamento requisito -> design -> task -> teste.

## Requirements

### Requirement 1 — Listagem consolidada com filtros e busca

**User Story:** Como admin, quero listar todos os agendamentos da barbearia com filtros por data, barbeiro, status e busca por cliente, para ter visao operacional do dia sem depender de cada barbeiro.

#### Acceptance Criteria

1. WHEN o admin acessa `/admin/agendamentos` THEN o Admin_Appointment_Service SHALL retornar a primeira pagina de agendamentos ordenados por `date desc, startTime asc` com `limit=20` por default.
2. WHEN o admin aplica filtro de `startDate` e `endDate` THEN o Admin_Appointment_Service SHALL retornar apenas agendamentos dentro do intervalo `[startDate, endDate]` inclusivo.
3. WHEN o admin aplica filtro de `barberId` THEN o Admin_Appointment_Service SHALL retornar apenas agendamentos daquele barbeiro.
4. WHEN o admin aplica filtro de `status` (CONFIRMED, CANCELLED_BY_CLIENT, CANCELLED_BY_BARBER, COMPLETED, NO_SHOW) THEN o Admin_Appointment_Service SHALL retornar apenas agendamentos com esse status.
5. WHEN o admin busca por termo `q` THEN o Admin_Appointment_Service SHALL procurar em `Profile.fullName`, `Profile.phone`, `GuestClient.name`, `GuestClient.phone` (case-insensitive) e retornar os agendamentos do cliente/guest correspondente.
6. WHEN o admin nao envia `startDate` e `endDate` THEN o Admin_Appointment_Service SHALL aplicar o intervalo default `[hoje, hoje + 7 dias]`.
7. WHEN a listagem retornar THEN cada item SHALL incluir: `id, date, startTime, endTime, status, barber { id, name }, service { id, name, price, duration }, client { id, fullName, phone } | guestClient { id, name, phone }, cancelReason, createdAt`.
8. IF o usuario chamador nao for admin THEN o Admin_Appointment_Service SHALL retornar 403 FORBIDDEN via `requireAdmin()` (ver `src/lib/auth/requireAdmin.ts:37`).

### Requirement 2 — Criacao manual de agendamento pelo admin

**User Story:** Como admin, quero criar um agendamento em nome de um cliente (autenticado ou guest) para qualquer barbeiro, para atender pedidos feitos por telefone ou presencialmente.

#### Acceptance Criteria

1. WHEN o admin envia `POST /api/admin/appointments` com `barberId`, `serviceId`, `date`, `startTime` e um identificador de cliente (`clientProfileId` OU bloco `guest { name, phone }`) THEN o Admin_Appointment_Service SHALL criar o agendamento reusando a logica de `createAppointment` ou `createAppointmentByBarber` (ver `src/services/booking.ts:619,934`).
2. WHEN o admin informa `clientProfileId` THEN o Admin_Appointment_Service SHALL validar que o Profile existe antes de criar.
3. WHEN o admin informa bloco `guest { name, phone }` e ja existe `GuestClient` com o mesmo telefone THEN o Admin_Appointment_Service SHALL reusar o `GuestClient` existente; ELSE SHALL criar um novo.
4. WHEN o slot alvo estiver ocupado THEN o Admin_Appointment_Service SHALL retornar erro `SLOT_OCCUPIED` (409) — a criacao admin NAO bypassa colisao (advisory-lock em `src/services/booking.ts:210`).
5. WHEN `startTime` estiver no passado THEN o Admin_Appointment_Service SHALL rejeitar com `SLOT_IN_PAST` (400) — admin NAO cria retroativamente nesta iteracao.
6. WHEN `SHOP_CLOSED` ou `BARBER_UNAVAILABLE` ocorrer THEN o Admin_Appointment_Service SHALL retornar o erro correspondente do dominio.
7. WHEN a criacao for bem sucedida THEN o Admin_Appointment_Service SHALL disparar `notifyAppointmentConfirmed` (ver `src/services/notification.ts`) para o `Profile.userId` do cliente (se autenticado); guests NAO recebem notificacao in-app.
8. WHEN a criacao for bem sucedida THEN o audit log SHALL registrar `createdBy: admin.profileId` e `source: "ADMIN"` na tabela `appointments` (via novos campos opcionais — ver design).
9. IF o chamador nao for admin THEN o Admin_Appointment_Service SHALL retornar 403.
10. WHEN o request nao tiver `Origin`/`Referer` validos THEN o Admin_Appointment_Service SHALL retornar 403 via `requireValidOrigin` (ver `src/lib/api/verify-origin.ts`).

### Requirement 3 — Cancelamento administrativo com bypass da janela de 2h

**User Story:** Como admin, quero cancelar qualquer agendamento (inclusive dentro da janela de 2h que bloqueia cliente/barbeiro), para resolver imprevistos operacionais.

#### Acceptance Criteria

1. WHEN o admin envia `PATCH /api/admin/appointments/[id]/cancel` com `reason` obrigatorio (min 3 chars) THEN o Admin_Appointment_Service SHALL cancelar o agendamento mesmo se estiver dentro da janela de 2h (bypass de `CANCELLATION_BLOCKED` de `src/services/booking.ts:1353`).
2. WHEN o agendamento ja estiver cancelado ou no passado THEN o Admin_Appointment_Service SHALL retornar `APPOINTMENT_NOT_CANCELLABLE` (400) — bypass aplica-se apenas a janela de tempo, nao ao estado.
3. WHEN o cancelamento ocorrer THEN o `status` SHALL ser `CANCELLED_BY_BARBER` (reusa enum) e `cancelReason` SHALL armazenar `"[ADMIN] <reason>"` para distinguir no historico.
4. WHEN o agendamento tiver `clientId` THEN o Admin_Appointment_Service SHALL notificar o cliente via `notifyAppointmentCancelledByBarber` (ver padrao em `src/app/api/appointments/[id]/cancel/route.ts:116`).
5. WHEN o agendamento tiver `guestClientId` THEN o Admin_Appointment_Service SHALL registrar a notificacao para envio transacional futuro (depende de spec `transactional-emails`), sem falhar a operacao.
6. WHEN o cancelamento ocorrer THEN o Admin_Appointment_Service SHALL notificar o barbeiro responsavel via `Notification` in-app.
7. WHEN o cancelamento ocorrer THEN o audit log SHALL registrar `cancelledBy: admin.profileId` e `source: "ADMIN"`.
8. IF `reason` estiver ausente ou curto demais THEN o Admin_Appointment_Service SHALL retornar `VALIDATION_ERROR` 422.
9. IF o chamador nao for admin THEN o Admin_Appointment_Service SHALL retornar 403.

### Requirement 4 — Reagendamento administrativo

**User Story:** Como admin, quero mover um agendamento para outra data/horario ou outro barbeiro, para resolver pedidos de troca sem forcar o cliente a cancelar e recriar.

#### Acceptance Criteria

1. WHEN o admin envia `PATCH /api/admin/appointments/[id]` com `date`, `startTime` e/ou `barberId` alvo THEN o Admin_Appointment_Service SHALL invocar o servico de reagendamento exposto pela spec `booking-reschedule` (dependencia obrigatoria).
2. WHEN a spec `booking-reschedule` nao estiver mergeada THEN esta feature SHALL expor apenas um stub que retorna `NOT_IMPLEMENTED` (501) para este endpoint, sem bloquear os demais requirements.
3. WHEN o slot alvo estiver ocupado THEN o Admin_Appointment_Service SHALL retornar `SLOT_OCCUPIED` (409).
4. WHEN o reagendamento for bem sucedido THEN o agendamento SHALL manter o `id` original e atualizar `date`, `startTime`, `endTime` e opcionalmente `barberId`.
5. WHEN o reagendamento for bem sucedido THEN ambas as partes (cliente e barbeiros antigo/novo) SHALL ser notificadas.
6. WHEN o admin reagendar THEN o audit log SHALL registrar `rescheduledBy: admin.profileId` e a transicao `from -> to`.

### Requirement 5 — Calendario consolidado diario/semanal

**User Story:** Como admin, quero ver todos os barbeiros em um calendario lado a lado (dia ou semana), para identificar janelas livres e carga por barbeiro sem abrir cada barbeiro separadamente.

#### Acceptance Criteria

1. WHEN o admin acessa `/admin/agendamentos/calendario?view=day&date=YYYY-MM-DD` THEN a UI SHALL renderizar uma grade com colunas = barbeiros ativos ordenados por nome e linhas = slots do shop (ver `src/services/shop-hours.ts`).
2. WHEN o admin acessa `view=week` THEN a UI SHALL renderizar 7 abas de dia OU uma matriz barbeiro x dia (opcao a ser definida no design), ambas retornando os mesmos dados da API.
3. WHEN a API `GET /api/admin/appointments/calendar` for chamada com `view`, `date` e opcional `barberIds` THEN ela SHALL retornar `{ barbers: [{ id, name }], slots: [{ barberId, date, startTime, endTime, appointment? }] }` cobrindo o intervalo consultado.
4. WHEN existir `BarberAbsence` ou `ShopClosure` no intervalo THEN os slots afetados SHALL ser marcados com flag `blocked: true` e `reason` para a UI renderizar visualmente.
5. WHEN o admin clicar em um slot vazio THEN a UI SHALL abrir o modal de criacao manual pre-preenchendo `barberId`, `date` e `startTime` (Requisito 2).
6. WHEN o admin clicar em um slot ocupado THEN a UI SHALL abrir um painel lateral com detalhes do agendamento e acoes (cancelar, reagendar, completar).
7. WHEN o intervalo consultado exceder 14 dias THEN a API SHALL rejeitar com `RANGE_TOO_LARGE` (400) para limitar custo.

### Requirement 6 — Paginacao, performance e ordenacao

**User Story:** Como admin, quero a listagem responder rapidamente mesmo com milhares de agendamentos historicos, para nao travar a operacao.

#### Acceptance Criteria

1. WHEN a listagem for chamada THEN ela SHALL usar `parsePagination` (`src/lib/api/pagination.ts:7`) com `limit default=20` e `limit max=100`.
2. WHEN a listagem for chamada THEN a resposta SHALL incluir `meta: { total, page, limit, totalPages }` via `apiCollection` (`src/lib/api/response.ts:23`).
3. WHEN o total de registros for > 10_000 THEN o tempo de resposta p95 SHALL ser < 500ms em ambiente de producao (medido via logs).
4. WHEN a query incluir `startDate`, `endDate` e opcionalmente `barberId` THEN o Prisma SHALL usar o indice `@@index([barberId, date, status])` ja existente em `prisma/schema.prisma:234`.
5. WHEN o filtro `q` (busca texto) for usado THEN o Admin_Appointment_Service SHALL limitar a busca a `Profile`/`GuestClient` primeiro (subquery) e depois filtrar `Appointment` por `IN (ids)`, evitando JOIN caro em tabela grande.
6. WHEN o admin ordenar por coluna custom (ex: `createdAt desc`) THEN a API SHALL aceitar `orderBy` whitelisted: `date`, `startTime`, `createdAt`, `status`.

### Requirement 7 — Seguranca e auditabilidade

**User Story:** Como admin, quero que toda acao admin seja autenticada, autorizada, protegida contra CSRF e registrada, para conformidade e rastreabilidade.

#### Acceptance Criteria

1. WHEN qualquer rota admin desta feature for chamada THEN ela SHALL invocar `requireAdmin()` antes de qualquer leitura/escrita.
2. WHEN qualquer rota de mutacao (POST/PATCH/DELETE) for chamada THEN ela SHALL invocar `requireValidOrigin` (`src/lib/api/verify-origin.ts`).
3. WHEN qualquer rota de mutacao for chamada THEN ela SHALL aplicar rate limit via `checkRateLimit("admin-appointments", clientId)` (ver `src/lib/rate-limit.ts`).
4. WHEN uma acao admin modificar um agendamento THEN os campos novos `createdBy`, `cancelledBy`, `rescheduledBy` na tabela `appointments` SHALL ser populados com `admin.profileId` (migration nesta spec).
5. WHEN um erro for retornado ao cliente THEN ele NAO SHALL expor stack traces (ver `docs/.claude/rules/security.md`).
6. WHEN um erro de dominio conhecido ocorrer THEN a API SHALL retornar o codigo padronizado da tabela em `src/app/api/appointments/route.ts:197-238`.

## Non-Goals

- Reagendamento automatico por politicas (ex: barbeiro faltou): out of scope; esta feature so expoe a acao manual do admin.
- Cancelamento em lote: out of scope nesta iteracao.
- Relatorios/KPIs de agendamentos: cobertos por `src/services/dashboard.ts` — esta feature apenas consome dados, nao gera novos agregados.
- Criacao retroativa (datas/horarios passados): nao suportada.
- Notificacao transacional por e-mail/WhatsApp para guests: depende da spec `transactional-emails`.

## Traceability

| Requirement | Design section | Task(s) |
|-------------|----------------|---------|
| 1 — Listagem com filtros | API `GET /api/admin/appointments`, Zod `listQuerySchema`, Service `listAppointmentsForAdmin`, UI `AdminAppointmentsTable` | 2.1, 3.1, 4.1, 5.1 |
| 2 — Criacao manual | API `POST /api/admin/appointments`, Zod `adminCreateSchema`, Service `createAppointmentAsAdmin`, UI modal `AdminCreateAppointmentDialog` | 2.2, 3.2, 4.2, 5.2 |
| 3 — Cancelamento bypass | API `PATCH /api/admin/appointments/[id]/cancel`, Service `cancelAppointmentAsAdmin`, UI action | 2.3, 3.3, 4.3, 5.3 |
| 4 — Reagendamento | API `PATCH /api/admin/appointments/[id]` + dependencia `booking-reschedule` | 2.4, 3.4, 4.4 |
| 5 — Calendario consolidado | API `GET /api/admin/appointments/calendar`, UI `AdminCalendarGrid` | 2.5, 3.5, 5.4, 5.5 |
| 6 — Paginacao/performance | `parsePagination`, indices existentes, bench | 3.1, 6.1 |
| 7 — Seguranca | `requireAdmin`, `requireValidOrigin`, rate limit, campos audit + migration Prisma | 1.1, 1.2, 6.2 |
