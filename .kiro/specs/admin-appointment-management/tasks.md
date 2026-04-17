# Implementation Plan - Admin Appointment Management

> Ordem: TDD (RED -> GREEN -> REFACTOR). (P) marca tarefas paralelizaveis dentro de uma mesma secao. Itens com `*` sao property tests opcionais mas recomendados.
> Dependencia externa: Tarefas da secao 7 (reschedule) exigem que a spec `booking-reschedule` esteja em andamento; ate la, o endpoint expõe stub `NOT_IMPLEMENTED` (501).

## 1. Setup e Migrations

- [x] 1.1 Migration Prisma — adicionar campos de auditoria em `Appointment`
  - Criar migration `add_appointment_audit_fields`
  - Adicionar enum `AppointmentSource { CLIENT, BARBER, ADMIN, GUEST, IMPORT }`
  - Adicionar colunas `source` (default CLIENT), `created_by?`, `cancelled_by?`, `rescheduled_by?`
  - Adicionar `@@index([source])`
  - Arquivo: `prisma/schema.prisma:208`
  - _Requirements: 7.4_

- [x] 1.2 Extrair helper internal em `src/services/booking.ts` para bypass controlado
  - Criar funcao privada `cancelAppointmentInternal(id, actor, opts: { bypassCancelWindow: boolean })`
  - Refatorar `cancelAppointmentByBarber` (linha 1427) e `cancelAppointmentByClient` (linha 1330) para delegar
  - NAO alterar comportamento externo (tests existentes devem continuar passando)
  - _Requirements: 3.1_

## 2. Schemas Zod (P)

- [x] 2.1 (P) Criar `src/lib/validations/admin-appointments.ts`
  - Exportar `listAdminAppointmentsQuerySchema`
  - Exportar `adminCreateAppointmentSchema` (com refine que exige clientProfileId XOR guest)
  - Exportar `adminCancelAppointmentSchema`
  - Exportar `adminRescheduleAppointmentSchema`
  - Exportar `calendarQuerySchema`
  - Criar `src/lib/validations/__tests__/admin-appointments.test.ts` (unit)
  - _Requirements: 1, 2.1, 3.8, 4, 5, 6.6_

- [ ] 2.2* (P) Property test: schemas admin
  - **Property 3: Criacao admin rejeita dois identificadores simultaneos**
  - **Validates: Requirements 2.1**

## 3. Service Facade

- [x] 3.1 Criar `src/services/admin/appointments.ts` com todas as funcoes da interface do design
  - `listAppointmentsForAdmin(filters)` — usar `parsePagination`, aplicar filtros, indice `[barberId, date, status]`
  - `createAppointmentAsAdmin(input, adminProfileId)` — delegar a `createAppointment` ou `createAppointmentByBarber` setando `source=ADMIN`, `createdBy`
  - `cancelAppointmentAsAdmin(id, reason, adminProfileId)` — chamar `cancelAppointmentInternal` com `bypassCancelWindow: true`, prefixar `cancelReason` com `[ADMIN]`, setar `cancelledBy`
  - `rescheduleAppointmentAsAdmin` — stub lancando `NOT_IMPLEMENTED` (a ser ligado quando spec `booking-reschedule` mergeada)
  - `getCalendarForAdmin({view,date,barberIds})` — gerar slots via `shop-hours` + `availability-windows`, anotar `blocked` para `BarberAbsence`/`ShopClosure`, acoplar `appointment?` do dia
  - _Requirements: 1, 2, 3, 4, 5_

- [x] 3.2 Criar `src/services/admin/__tests__/appointments.test.ts`
  - Unit: listagem com cada filtro
  - Unit: criacao com `clientProfileId` e com `guest` (incluindo reuso de `GuestClient` por telefone)
  - Unit: cancelamento bypassa janela de 2h mas respeita `APPOINTMENT_IN_PAST`
  - Unit: calendario marca `blocked` para closures/absences
  - _Requirements: 1, 2, 3, 5_

- [ ] 3.3* Property tests: service
  - **Property 1: Listagem retorna apenas agendamentos no intervalo**
  - **Property 2: Filtro barbeiro+status exclusivo**
  - **Property 4: Cancelamento admin bypassa apenas janela de tempo**
  - **Property 7: Calendario respeita limite 14 dias**
  - **Validates: Requirements 1.2, 1.3, 1.4, 3.1, 3.2, 5.7**

## 4. Route Handlers (P apos 3.1)

- [x] 4.1 (P) `src/app/api/admin/appointments/route.ts` — GET (list) + POST (create)
  - `requireAdmin` + `requireValidOrigin` (POST) + `checkRateLimit("admin-appointments", ...)` (POST)
  - Mapear erros de dominio (tabela em `design.md`)
  - Retornar `apiCollection(rows, paginationMeta(total, page, limit))` para GET
  - Retornar `apiSuccess(created, 201)` para POST
  - Criar `__tests__/list.route.test.ts` e `__tests__/create.route.test.ts`
  - _Requirements: 1, 2, 6, 7_

- [x] 4.2 (P) `src/app/api/admin/appointments/[id]/cancel/route.ts` — PATCH
  - Validar `adminCancelAppointmentSchema`
  - Chamar `cancelAppointmentAsAdmin`
  - Notificar cliente (se `clientId`) e barbeiro
  - Criar `__tests__/cancel.route.test.ts`
  - _Requirements: 3, 7_

- [x] 4.3 (P) `src/app/api/admin/appointments/[id]/route.ts` — PATCH (reschedule stub)
  - Validar `adminRescheduleAppointmentSchema`
  - Delegar a `rescheduleAppointmentAsAdmin` (stub 501 ate spec `booking-reschedule`)
  - Criar `__tests__/reschedule.route.test.ts` (teste 501 por enquanto)
  - _Requirements: 4_

- [x] 4.4 (P) `src/app/api/admin/appointments/calendar/route.ts` — GET
  - Validar `calendarQuerySchema`
  - Rejeitar intervalo > 14 dias com `RANGE_TOO_LARGE`
  - Chamar `getCalendarForAdmin`
  - Criar `__tests__/calendar.route.test.ts`
  - _Requirements: 5, 6_

- [ ] 4.5* Property test: autorizacao
  - **Property 6: Apenas admin pode chamar as rotas**
  - Teste parametrizado sobre as 4 rotas com: (sem sessao), (sessao cliente), (sessao barbeiro) -> 401/403
  - **Validates: Requirements 1.8, 7.1**

## 5. Checkpoint

- [ ] 5. Rodar `pnpm test:gate` (lint + test + coverage) — deve passar 100%.

## 6. UI — Tabela e Filtros

- [x] 6.1 Criar pagina admin
  - `src/app/[locale]/(protected)/admin/agendamentos/page.tsx` (server component)
  - `src/app/[locale]/(protected)/admin/agendamentos/AgendamentosPageClient.tsx` (client, Tabs "Lista" / "Calendario")
  - _Requirements: 1, 5_

- [x] 6.2 (P) Criar `src/components/admin/appointments/AdminAppointmentsFilters.tsx`
  - Inputs: date range, select barber, select status, busca `q`
  - Debounce 300ms para busca
  - _Requirements: 1_

- [x] 6.3 (P) Criar `src/components/admin/appointments/AdminAppointmentsTable.tsx`
  - React Query para fetch `GET /api/admin/appointments`
  - Paginacao com `meta.totalPages`
  - Colunas: data, horario, cliente/guest, servico, barbeiro, status, acoes
  - Linha de acoes abre `AdminAppointmentDrawer`
  - _Requirements: 1, 6_

- [x] 6.4 (P) Criar `src/components/admin/appointments/AdminAppointmentDrawer.tsx`
  - Painel lateral com detalhes
  - Botoes: "Cancelar", "Reagendar", "Completar"
  - _Requirements: 3, 4_

- [x] 6.5 Criar `src/components/admin/appointments/AdminCreateAppointmentDialog.tsx`
  - React-hook-form + `adminCreateAppointmentSchema`
  - Toggle "Cliente cadastrado" vs "Convidado" (XOR)
  - Autocomplete de cliente (reusar endpoint existente ou criar `GET /api/admin/clients?q=` — pode vir da spec `admin-client-management`)
  - Select de barbeiro/servico/slot disponivel
  - _Requirements: 2_

- [x] 6.6 Criar `src/components/admin/appointments/AdminCancelAppointmentDialog.tsx`
  - Textarea motivo obrigatorio (>=3 chars)
  - Aviso amarelo quando estiver dentro da janela de 2h ("bypass admin ativo")
  - _Requirements: 3_

- [x] 6.7 Criar `src/components/admin/appointments/AdminRescheduleDialog.tsx` (stub)
  - Exibir estado "em breve" enquanto spec `booking-reschedule` nao estiver concluida
  - _Requirements: 4_

## 7. UI — Calendario consolidado

- [x] 7.1 (P) Criar `src/components/admin/appointments/AdminCalendarGrid.tsx`
  - Props: `view: "day"|"week"`, `date`, `barbers`, `slots`
  - View dia: colunas = barbeiros, linhas = horarios
  - View semana: tabs de dia OU matriz barbeiros x dias (escolher durante implementacao)
  - _Requirements: 5.1, 5.2_

- [x] 7.2 (P) Criar `src/components/admin/appointments/AdminCalendarSlot.tsx`
  - Estados: livre (clicavel -> CreateDialog pre-preenchido), ocupado (clicavel -> Drawer), bloqueado (disabled com tooltip)
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 7.3 Integrar calendario na aba "Calendario" de `AgendamentosPageClient.tsx`
  - React Query para `GET /api/admin/appointments/calendar`
  - Seletor de view (day/week) e date picker
  - _Requirements: 5_

## 8. i18n

- [ ] 8.1 Adicionar namespace `admin.appointments` em `src/i18n/messages/pt-BR.json`, `en.json`, `es.json`
  - Labels de filtros, acoes, toasts, mensagens de erro mapeadas
  - _Requirements: 1-7 (UI strings)_

## 9. Seed e Performance

- [ ] 9.1 Criar seed de dados para QA e bench
  - `prisma/seed-admin-appointments.ts` com ~500 registros sinteticos distribuidos em 3 barbeiros + 30 dias + statuses variados
  - Adicionar comando npm script `pnpm db:seed:admin`
  - _Requirements: 6.3_

- [ ] 9.2 Bench p95 da listagem
  - Script em `scripts/bench-admin-appointments.ts` mede `GET /api/admin/appointments` com 10k rows
  - Verificar p95 < 500ms (Requirement 6.3)
  - _Requirements: 6.3, 6.4_

## 10. Integracao com specs vizinhas

- [ ] 10.1 Quando spec `booking-reschedule` estiver merged
  - Trocar stub de `rescheduleAppointmentAsAdmin` por chamada real
  - Remover status 501 do handler
  - Habilitar `AdminRescheduleDialog` completo
  - _Requirements: 4_

- [ ] 10.2 Quando spec `admin-client-management` estiver merged
  - Integrar autocomplete de cliente em `AdminCreateAppointmentDialog` com o endpoint oficial
  - _Requirements: 2_

- [ ] 10.3 Quando spec `transactional-emails` estiver merged
  - Habilitar notificacao transacional (e-mail/WhatsApp) para guests em cancelamento admin (Requirement 3.5)
  - _Requirements: 3.5_

## 11. Final Checkpoint

- [ ] 11. Rodar `pnpm test:gate` final e verificar:
  - Todos os requirements cobertos por pelo menos 1 teste
  - Coverage >= mesma linha de base do projeto
  - `pnpm lint` limpo (Biome)
  - `pnpm build` passa
  - Property tests (2.2, 3.3, 4.5) em >=100 iteracoes

## Traceability (requisito -> tarefa)

| Requisito | Tarefas |
|-----------|---------|
| 1 — Listagem com filtros | 2.1, 3.1, 3.2, 4.1, 6.1, 6.2, 6.3 |
| 2 — Criacao manual | 2.1, 2.2*, 3.1, 3.2, 4.1, 6.5 |
| 3 — Cancelamento bypass | 1.2, 2.1, 3.1, 3.2, 3.3*, 4.2, 6.6 |
| 4 — Reagendamento | 2.1, 3.1, 4.3, 6.4, 6.7, 10.1 |
| 5 — Calendario consolidado | 2.1, 3.1, 3.2, 4.4, 7.1, 7.2, 7.3 |
| 6 — Paginacao/performance | 3.1, 4.1, 9.1, 9.2 |
| 7 — Seguranca/auditoria | 1.1, 4.1, 4.2, 4.3, 4.4, 4.5* |
