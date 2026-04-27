# Tasks — admin-barber-services

Sequencia TDD (RED -> GREEN -> REFACTOR) conforme CLAUDE.md. Cada bloco esta preparado para virar um ou mais commits Conventional Commits.

## Fase 0 — Preparacao (sem codigo)

- [ ] T0.1 Revisar este spec com o owner e confirmar decisao sobre overrides (R5 entra? Se sim, adicionar migracao no T2).
- [ ] T0.2 Alinhar com area de Booking que a flag `barber_services_enforced` entrara como `false` por default.

## Fase 1 — Schema e seed (RED mais leve, sem logica)

- [ ] T1.1 Migrar schema: adicionar model `AdminAuditLog` no `prisma/schema.prisma` (nao tocar em `BarberService` neste momento).
- [ ] T1.2 Gerar migration `prisma migrate dev` e revisar SQL.
- [ ] T1.3 Adicionar seed/upsert da `FeatureFlag('barber_services_enforced', enabled=false)` em `prisma/seed.ts`.
- [ ] T1.4 Criar migration SQL com seed condicional de `BarberService` como produto cartesiano `Barber.active x Service.active` **apenas se a tabela estiver vazia** (idempotente).

Testes associados: verificar via `prisma db seed` + assertions em script de test setup que a seed nao duplica linhas em reruns.

## Fase 2 — Service layer (TDD)

- [ ] T2.1 RED: criar `src/services/admin/__tests__/barber-services.test.ts` com casos:
  - lista matriz vazia retorna todos nao associados.
  - `setServicesForBarber` adiciona e remove conforme diff.
  - `setServicesForBarber` rejeita quando ha agendamentos futuros em pares removidos e `force=false`.
  - `setServicesForBarber` grava `AdminAuditLog` para cada item.
  - `bootstrapBarberServices({ onlyIfEmpty: true })` nao-op quando ja existem linhas.
  - `setBarbersForService` espelha o comportamento.
- [ ] T2.2 GREEN: implementar `src/services/admin/barber-services.ts` conforme design.md (tipos explicitos, sem `any`).
- [ ] T2.3 REFACTOR: extrair helper de diff `computeAssociationDiff(current, target)` com test unitario dedicado.

## Fase 3 — Ajuste do booking (TDD)

- [ ] T3.1 RED: estender `src/services/__tests__/booking.property.test.ts` (ou criar novo arquivo) cobrindo:
  - com flag OFF e BarberService vazio, `getServices(barberId)` retorna servicos ativos.
  - com flag OFF e servico com alguns barbeiros associados, comporta-se como enforced (nao libera barbeiros fora da lista).
  - com flag ON, ausencia de par => `SLOT_UNAVAILABLE`.
  - `bookAppointment` rejeita par invalido sob flag ON.
- [ ] T3.2 GREEN: adicionar helper `getBarberServicesEnforcement()` (cacheado) e propagar `enforced` em `isServiceAvailableForBarber` e `getServices(barberId)`.
- [ ] T3.3 REFACTOR: documentar a convencao em `src/services/booking.ts` com comentario explicando a flag.

## Fase 4 — Rotas admin (TDD)

- [ ] T4.1 RED: criar testes em `src/app/api/admin/barbers/[id]/services/__tests__/route.test.ts` e `src/app/api/admin/services/[id]/barbers/__tests__/route.test.ts`:
  - requer admin autenticado.
  - requer `Origin` valido em `PUT`.
  - valida payload via Zod.
  - retorna 409 `HAS_FUTURE_APPOINTMENTS` quando aplicavel.
- [ ] T4.2 RED: testes para `GET /api/admin/barbers-services/matrix` e `POST /api/admin/barbers-services/bootstrap`.
- [ ] T4.3 GREEN: implementar handlers nas rotas (`route.ts`) delegando ao service layer.
- [ ] T4.4 GREEN: garantir `revalidateTag("public-services")` e cache tag dos endpoints admin.

## Fase 5 — UI admin (TDD leve + componentes)

- [ ] T5.1 RED: testes de componente `MatrixPageClient` (render basico, toggle + salvar, estado de erro).
- [ ] T5.2 GREEN: criar hooks `useAdminBarberServicesMatrix`, `useAdminBarberServices`, `useAdminServiceBarbers`, `useBarberServicesEnforcementFlag`.
- [ ] T5.3 GREEN: implementar paginas:
  - `src/app/[locale]/(protected)/admin/barbearia/barbeiros-servicos/page.tsx`
  - `src/app/[locale]/(protected)/admin/barbeiros/[id]/servicos/page.tsx`
  - `src/app/[locale]/(protected)/admin/barbearia/servicos/[id]/barbeiros/page.tsx`
- [ ] T5.4 GREEN: adicionar entradas de navegacao no menu admin.

## Fase 6 — Integracao booking (UI publica)

- [ ] T6.1 Se nao existir, criar `GET /api/booking/barbers?serviceId=...` com testes.
- [ ] T6.2 Atualizar `BarberSelector` / `ChatBarberSelector` para consumir o endpoint filtrado quando o cliente ja escolheu um servico.
- [ ] T6.3 Atualizar `ChatServiceSelector` caso necessario para refletir filtro por barbeiro (ja deve funcionar; apenas validar).

## Fase 7 — Auditoria

- [ ] T7.1 Garantir escrita em `AdminAuditLog` em T2.2 (ja previsto nos testes).
- [ ] T7.2 Criar rota admin minima (so-leitura) `GET /api/admin/audit-logs?entity=barber_service` para uso futuro; nao expor na UI no MVP. Opcional, pode ir para follow-up.

## Fase 8 — i18n

- [ ] T8.1 Adicionar strings em `pt-BR` e `en` para todas as novas telas e toasts.
- [ ] T8.2 Revisar com brand book tokens e estilo vigente (light + dark).

## Fase 9 — Testes e2e e regressao

- [ ] T9.1 E2e admin: matriz, salvar, recarregar e verificar estado persistido.
- [ ] T9.2 E2e booking: cliente agenda par associado com sucesso; par nao associado (com flag ON em ambiente de teste) recebe feedback adequado.
- [ ] T9.3 `pnpm test:gate` local + CI.

## Fase 10 — Rollout

- [ ] T10.1 Deploy com flag `barber_services_enforced=false`.
- [ ] T10.2 Rodar `POST /api/admin/barbers-services/bootstrap` se a migracao idempotente nao tiver populado (confirmar).
- [ ] T10.3 Admin revisa matriz e faz ajustes finos por barbeiro.
- [ ] T10.4 Toggle da flag para `true` em janela de baixo trafego, com rollback rapido definido (toggle de volta para `false`).
- [ ] T10.5 Monitorar erros `SLOT_UNAVAILABLE` por 48h.

## Checklists de saida

- [ ] Todos os requisitos R1-R10 tem pelo menos um teste ligado.
- [ ] Nenhum uso de `any` adicionado.
- [ ] `pnpm lint`, `pnpm test`, `pnpm test:gate` verdes.
- [ ] Documentacao atualizada em `docs/` descrevendo bootstrap + flag.
- [ ] PR referencia `audit-2026-04-15/P1-#8` na descricao.

## Rastreabilidade

| Task | Requisitos cobertos |
|------|---------------------|
| T1.1, T8 | R8 (AdminAuditLog), R10 |
| T1.3, T1.4 | R4.1, R4.2 |
| T2.* | R2, R3, R4.4, R4.5, R6.3, R8 |
| T3.* | R6.1, R6.2, R4.2, R4.3 |
| T4.* | R1, R2, R3 |
| T5.* | R1, R2, R3, R10 |
| T6.* | R7 |
| T7.* | R8 |
| T9.* | Integrador geral |
| T10.* | R4 (rollout seguro) |
