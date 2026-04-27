# Plano de Implementacao

Ordem TDD: RED (teste) -> GREEN (implementacao) -> REFACTOR. Cada sub-task `[ ]` representa uma unidade verificavel. Testes devem existir antes da implementacao correspondente.

- [ ] 1. Fundacao: schemas Zod, tipos e helpers
  - [ ] 1.1 Criar `src/types/admin-clients.ts` com `ClientRow`, `ClientDetail`, `ClientType`, `UpdateClientInput`, `ExportParams`, `InactiveParams`, `ClaimResult`
  - [ ] 1.2 Criar `src/lib/validations/admin-clients.ts` com schemas Zod (`listClientsQuery`, `updateClientProfileSchema`, `updateClientNotesSchema`, `banClientSchema`, `exportClientsQuery`, `inactiveClientsQuery`, `claimGuestSchema`)
  - [ ] 1.3 Criar testes em `src/lib/validations/__tests__/admin-clients.test.ts` cobrindo casos validos/invalidos e limites (paginacao max 100, justification min 10 chars, days in [30,60,90])
  - [ ] 1.4 Criar `src/lib/privacy/mask.ts` com `maskEmail`, `maskPhone`, `maskCpf`, `maskName`, `redactObject`
  - [ ] 1.5 Criar testes em `src/lib/privacy/__tests__/mask.test.ts`
  _Requirements: 1, 2, 4, 5, 6, 7, 8, 10, 13_

- [ ] 2. Migrations Prisma
  - [ ] 2.1 Adicionar `adminNotes String?` em `Profile` e `GuestClient` (`@db.Text`)
  - [ ] 2.2 Adicionar `@@index([fullName])` em `Profile` e `GuestClient`
  - [ ] 2.3 Adicionar coluna `bannedByAdminProfileId String?` em `BannedClient` com relacao `bannedByAdmin` para `Profile`; migracao SQL inclui CHECK constraint (`banned_by IS NOT NULL OR banned_by_admin_profile_id IS NOT NULL`)
  - [ ] 2.4 Migration opcional `enable_pg_trgm_clients` com `CREATE EXTENSION pg_trgm` + gin indexes (comentada inicialmente, ativar se `EXPLAIN` mostrar seq scan)
  - [ ] 2.5 Rodar `pnpm prisma migrate dev --name admin_client_management`
  - [ ] 2.6 Atualizar `schema.baseline.prisma` se aplicavel
  _Requirements: 3, 4, 7, 11_

- [ ] 3. Service `listClients` (TDD)
  - [ ] 3.1 Criar `src/services/admin/__tests__/clients.test.ts` com casos: listagem default, busca por nome, busca por telefone normalizado (remove nao-digits), filtros combinados, paginacao, ordenacao, status active/inactive, exclusao de guests claimed
  - [ ] 3.2 Implementar `listClients` em `src/services/admin/clients.ts` usando `$queryRaw<ClientRow[]>` com UNION ALL (Profile + GuestClient nao-claimed) e subquery lateral para `lastAppointmentAt` + `totalAppointments`
  - [ ] 3.3 Validar performance com `EXPLAIN ANALYZE` em staging; documentar resultado em `docs/perf/admin-clients.md`
  - [ ] 3.4 Refatorar para extrair builders de WHERE clause se funcao > 80 linhas
  _Requirements: 1, 2, 9, 11_

- [ ] 4. Rota `GET /api/admin/clients`
  - [ ] 4.1 Criar `src/app/api/admin/clients/__tests__/route.test.ts` cobrindo: auth guard (401/403), validacao Zod (400), paginacao, filtros, resposta formato
  - [ ] 4.2 Implementar `src/app/api/admin/clients/route.ts` com `requireAdmin`, parse query via Zod, chamada a `listClients`, `handlePrismaError`
  _Requirements: 1, 2, 9, 13_

- [ ] 5. Service `getClientById` (TDD)
  - [ ] 5.1 Adicionar testes para: profile existe, guest existe, ambos nao existem (null), counts corretos, loyalty null para guest, inclui claimedGuests/claimedByProfile
  - [ ] 5.2 Implementar `getClientById` com `Promise.all` para basics/counts/loyalty/lastBans/adminAuditLogs
  _Requirements: 3, 10_

- [ ] 6. Rota `GET /api/admin/clients/[id]`
  - [ ] 6.1 Testes de route: auth, 404 quando nao existe, inclui audit log quando `includeSensitive=true`, erro 400 se `includeSensitive` sem `justification`
  - [ ] 6.2 Implementar rota chamando service + emitindo audit log `client.view-sensitive` quando aplicavel
  _Requirements: 3, 8, 13_

- [ ] 7. Service `updateClientProfile` e rota `PATCH /api/admin/clients/[id]`
  - [ ] 7.1 Testes service: profile update com diff audit, guest update (so fullName/phone), validacao campos proibidos (role/email), LGPD mask em log
  - [ ] 7.2 Implementar service dentro de transacao com audit log `client.profile.update`
  - [ ] 7.3 Testes de route com `requireAdmin` + `requireValidOrigin`
  - [ ] 7.4 Implementar `src/app/api/admin/clients/[id]/route.ts` (GET + PATCH)
  _Requirements: 4, 8, 13_

- [ ] 8. Notas internas
  - [ ] 8.1 Testes service `updateClientNotes` (max 2000 chars, null allowed, audit diff)
  - [ ] 8.2 Implementar service
  - [ ] 8.3 Testes e implementacao de `PATCH /api/admin/clients/[id]/notes`
  _Requirements: 3, 8_

- [ ] 9. Relatorio de inativos
  - [ ] 9.1 Testes service `listInactiveClients` (days=30/60/90, excludeBanned default, paginacao, calculo `daysSinceLast`)
  - [ ] 9.2 Implementar service com groupBy apropriado
  - [ ] 9.3 Testes e implementacao de `GET /api/admin/clients/inactive`
  _Requirements: 5_

- [ ] 10. Export CSV
  - [ ] 10.1 Criar `src/lib/csv/__tests__/stream.test.ts` — escape, BOM, delimiter `;`, UTF-8
  - [ ] 10.2 Implementar `src/lib/csv/stream.ts` com helper `toCsvRow(values: (string | number | null)[]): string`
  - [ ] 10.3 Testes service `exportClientsCsv` (stream iterable, campos default vs `includeSensitive`, cap em 5000 rows)
  - [ ] 10.4 Implementar service
  - [ ] 10.5 Testes rota `GET /api/admin/clients/export.csv` — rate limit (429), audit log (`client.export`), headers, `includeSensitive` exige justification
  - [ ] 10.6 Implementar rota com `ReadableStream` e rate limit
  _Requirements: 5, 6, 8, 13_

- [ ] 11. Ban/Unban via admin
  - [ ] 11.1 Atualizar `banned-client.ts::banClient` para aceitar `bannedByAdminProfileId` alternativo a `bannedByBarberId`; manter retrocompatibilidade
  - [ ] 11.2 Atualizar testes existentes de `banned-client.ts` e adicionar caso admin ban
  - [ ] 11.3 Testes rota `POST /api/admin/clients/[id]/ban` (profile e guest, ja banido -> 409, audit log)
  - [ ] 11.4 Implementar `src/app/api/admin/clients/[id]/ban/route.ts` (POST + DELETE)
  _Requirements: 7, 8_

- [ ] 12. Merge guest -> profile
  - [ ] 12.1 Testes service `claimGuestToProfile` (transacao, migra appointments, feedbacks, ban; guest ja claimed -> erro)
  - [ ] 12.2 Implementar service reaproveitando `migrateGuestBanToProfile` existente
  - [ ] 12.3 Testes e implementacao `POST /api/admin/clients/[profileId]/claim-guest`
  _Requirements: 9, 10, 8_

- [ ] 13. DataTable generico
  - [ ] 13.1 Criar `src/components/ui/__tests__/data-table.test.tsx` (render, pagination, empty state, loading, row click, a11y)
  - [ ] 13.2 Implementar `src/components/ui/data-table.tsx` com TypeScript generico
  _Requirements: 1, 2, 12_

- [ ] 14. UI listagem `/admin/clientes`
  - [ ] 14.1 Criar `src/app/[locale]/(protected)/admin/clientes/page.tsx` (server component)
  - [ ] 14.2 Criar `ClientListClient.tsx`, `ClientFiltersPanel.tsx`, `ClientDataTable.tsx`
  - [ ] 14.3 Testes de integracao UI (Vitest + Testing Library) cobrindo busca debounce, filtro apply, paginacao
  - [ ] 14.4 Adicionar link no menu admin existente
  _Requirements: 1, 2, 12_

- [ ] 15. UI detalhe `/admin/clientes/[id]`
  - [ ] 15.1 Criar `page.tsx` server + `ClientDetailClient.tsx` client
  - [ ] 15.2 Implementar `ClientDetailHeader`, `ClientTabs`, `BanClientDialog`, `ClaimGuestDialog`, `ClientNotesEditor`
  - [ ] 15.3 Testes de integracao cobrindo troca de aba, ban confirm, edit notes save, claim guest flow
  _Requirements: 3, 4, 7, 8, 10, 12_

- [ ] 16. UI relatorio de inativos `/admin/clientes/inativos`
  - [ ] 16.1 Criar `page.tsx` + `InactiveClientsReport.tsx`
  - [ ] 16.2 Testes de integracao (tabs 30/60/90, botao export)
  _Requirements: 5, 6, 12_

- [ ] 17. Audit log integration
  - [ ] 17.1 Criar `src/lib/audit/logAdminAction.ts` com feature flag `adminAuditLog.enabled`
  - [ ] 17.2 Testes unitarios (flag off -> console, flag on -> Prisma model)
  - [ ] 17.3 Integrar em todos os services mutativos (sections 7, 8, 10, 11, 12)
  - [ ] 17.4 Implementar aba "Historico admin" consumindo `GET /api/admin/clients/[id]/audit` (rota auxiliar)
  _Requirements: 8_

- [ ] 18. i18n
  - [ ] 18.1 Adicionar chaves `admin.clients.*` em `messages/pt-BR.json`
  - [ ] 18.2 Espelhar em `messages/en.json` e `messages/es.json`
  - [ ] 18.3 Smoke test: render de paginas em cada locale sem chaves faltantes
  _Requirements: 12_

- [ ] 19. Acessibilidade
  - [ ] 19.1 Revisao com Axe/Playwright: sem violations em `/admin/clientes` e detalhe
  - [ ] 19.2 Navegacao por teclado (tab order, focus trap em modais)
  - [ ] 19.3 Live region no DataTable anunciando resultados
  _Requirements: 12_

- [ ] 20. Seguranca e LGPD final
  - [ ] 20.1 Grep por `console.log` de dados sensiveis nos novos arquivos; substituir por `logger` + `mask`
  - [ ] 20.2 Revisar queries com `select` minimo (evitar `include` largo quando nao necessario)
  - [ ] 20.3 Rate limit verificado em export (10/hora)
  - [ ] 20.4 Testar com admin nao-admin (403) e sem sessao (401)
  _Requirements: 6, 13_

- [ ] 21. Validacao final (gate pre-PR)
  - [ ] 21.1 `pnpm test:gate` (lint + testes + coverage) verde
  - [ ] 21.2 `pnpm build` sem erros
  - [ ] 21.3 Validacao manual em staging com dataset real (>1000 clientes)
  - [ ] 21.4 Documentar changelog em `CHANGELOG.md` (se usado) ou PR description
  - [ ] 21.5 Atualizar `spec.json` (`approvals.*.approved = true`, `ready_for_implementation = true`)
  _Requirements: 1-13_
