# Requirements — Booking Polish (P2)

## Contexto

Bundle de polimentos P2 do subsistema de Booking identificados na auditoria
`docs/auditoria-projeto-2026-04-15.md` (itens P2 #12, #13, #14, #20). Os itens
são independentes em escopo funcional, porém compartilham arquivos de serviço,
hooks e validação, razão pela qual são agrupados em uma única spec para reduzir
sobrecarga de entrega, rollback e regressão.

Escopo:

- (a) Mensagem de lead time inconsistente (UI fala "1 hora", regra real são
  90 minutos).
- (b) Fechamento de ausência de barbeiro (`BarberAbsence.POST`) hoje **rejeita**
  criação quando há agendamentos confirmados conflitantes; precisamos de uma
  política explícita e automatizada.
- (c) Não há limite para o número de agendamentos futuros `CONFIRMED` que um
  mesmo cliente (autenticado ou guest) pode criar.
- (d) O advisory lock atual é por **barbeiro + data** (`lockBarberDateForBooking`
  em `src/services/booking.ts:200`), portanto não impede um mesmo cliente de
  reservar dois barbeiros para o mesmo intervalo.
- (e) Símbolos marcados como `@deprecated` — `getGuestAppointments(phone)` e
  `canCancelBeforeStart(minutesUntilAppointment)` — continuam exportados e
  referenciados em testes.

Premissas:

- Usar EARS (Easy Approach to Requirements Syntax).
- Preservar completamente o advisory lock por barbeiro existente; qualquer lock
  adicional é **cumulativo**, nunca substitutivo.
- pt-BR na documentação, mensagens ao usuário em pt-BR, en e es (3 idiomas).
- TDD: testes primeiro; proibido `any`.

## Requisito R1 — Mensagem de lead time sincronizada

**User Story**

> Como cliente do site, quando eu tento agendar um horário próximo demais, quero
> ver uma mensagem de erro que reflita a regra real, para que eu não tente
> novamente um horário que também será recusado.

**EARS**

- R1.1 — **Ubiquitous**: O sistema DEVE expor o valor de lead time do cliente em
  uma única fonte da verdade em `src/lib/booking/lead-time.ts`
  (`CLIENT_BOOKING_LEAD_MINUTES = 90`).
- R1.2 — **Event-driven**: QUANDO um cliente tentar criar agendamento com
  `minutesUntilSlot < CLIENT_BOOKING_LEAD_MINUTES`, ENTÃO o backend DEVE
  responder `SLOT_TOO_SOON` com uma `message` derivada do valor atual de
  `CLIENT_BOOKING_LEAD_MINUTES` (não hard-coded "1 hora").
- R1.3 — **Event-driven**: QUANDO o hook `useBooking` traduzir `SLOT_TOO_SOON`,
  ENTÃO a string apresentada ao usuário DEVE referenciar o valor atual de
  `CLIENT_BOOKING_LEAD_MINUTES`, sem duplicação literal.
- R1.4 — **Ubiquitous**: O arquivo `src/i18n/locales/{pt-BR,en,es}/booking.json`
  DEVE conter a chave `slotErrors.tooSoon` parametrizada por `{minutes}`, usada
  por qualquer componente/hook que exiba esse erro.
- R1.5 — **Unwanted-behavior**: SE o valor de `CLIENT_BOOKING_LEAD_MINUTES` for
  alterado, ENTÃO nenhuma mensagem (backend, hook ou i18n) DEVE conter o valor
  anterior literalmente — verificado por teste que consome a constante.

**Aceitação**

- `pnpm test` cobre: constante, mensagem backend, mensagem hook, render em
  pt-BR/en/es. A busca textual por `"1 hora de antecedência"` não retorna
  ocorrências em `src/`.

## Requisito R2 — Ausência de barbeiro cancela conflitos

**User Story**

> Como barbeiro, quando eu registro uma ausência que cobre agendamentos
> confirmados, quero que o sistema cancele esses agendamentos automaticamente e
> notifique os clientes, para que eu não precise cancelá-los um a um nem receba
> um erro 409 que me obriga a desfazer o trabalho.

**EARS**

- R2.1 — **Event-driven**: QUANDO o endpoint `POST /api/barbers/me/absences`
  receber uma ausência válida e existir ao menos um agendamento `CONFIRMED`
  sobreposto, ENTÃO o sistema DEVE cancelar esses agendamentos na mesma
  transação em que cria o `BarberAbsence`.
- R2.2 — **Ubiquitous**: Cada agendamento cancelado por R2.1 DEVE ter
  `cancelledAt = now`, `cancelledBy = "SYSTEM"`, `cancellationReason =
  "ABSENCE_AUTO_CANCEL"` e `status = CANCELLED`.
- R2.3 — **Event-driven**: QUANDO um agendamento for cancelado por R2.1, ENTÃO
  o sistema DEVE disparar notificação ao cliente (se autenticado ou guest com
  contato válido) e ao barbeiro, usando o canal atual do serviço
  `src/services/notification.ts`.
- R2.4 — **State-driven**: ENQUANTO a flag de configuração
  `BOOKING_ABSENCE_CONFLICT_POLICY` estiver em `"cancel"` (padrão), R2.1–R2.3
  aplicam-se. SE a flag estiver em `"reject"`, ENTÃO o sistema DEVE manter o
  comportamento atual (409 `ABSENCE_CONFLICT`).
- R2.5 — **Ubiquitous**: A flag DEVE residir em `src/config/feature-flags.ts`
  com default `"cancel"`, e seu valor atual DEVE ser considerado apenas dentro
  do endpoint (não propagar ao cliente).
- R2.6 — **Unwanted-behavior**: SE a transação falhar depois de cancelar
  agendamentos, ENTÃO o Prisma `$transaction` DEVE reverter todos os cancelamentos
  e nenhum `BarberAbsence` DEVE persistir.
- R2.7 — **Event-driven**: QUANDO um agendamento guest for cancelado por R2.1,
  ENTÃO o sistema DEVE preservar o `accessToken` existente para permitir que o
  guest veja o histórico, sem consumir o token.

**Aceitação**

- Teste: criar absence sobrepondo 2 agendamentos → resposta 201, ambos
  agendamentos ficam `CANCELLED` com metadados corretos, notificação disparada,
  banco consistente em caso de erro forçado no insert da absence.
- Teste: com flag `"reject"` mantida, o endpoint devolve 409 como hoje.

## Requisito R3 — Limite de agendamentos simultâneos futuros por cliente

**User Story**

> Como operador da barbearia, quero limitar a `N` (padrão 3) agendamentos
> futuros confirmados por cliente (autenticado ou guest identificado por
> telefone), para evitar squatting de horários e faltas em cadeia.

**EARS**

- R3.1 — **Ubiquitous**: O valor máximo DEVE estar em
  `src/config/feature-flags.ts` como `BOOKING_MAX_ACTIVE_PER_CLIENT` (default
  `3`).
- R3.2 — **Event-driven**: QUANDO um cliente autenticado chamar
  `createAppointment`, ENTÃO o serviço DEVE contar, dentro da mesma transação,
  seus agendamentos futuros com `status = CONFIRMED` antes de inserir; SE a
  contagem ≥ `BOOKING_MAX_ACTIVE_PER_CLIENT`, ENTÃO responder
  `CLIENT_LIMIT_REACHED` (HTTP 409).
- R3.3 — **Event-driven**: QUANDO um guest chamar `createGuestAppointment`,
  ENTÃO a contagem DEVE considerar todos os agendamentos futuros `CONFIRMED`
  cuja `guestClient.phoneDigits` coincida com `normalizePhoneDigits(input.phone)`
  — R3.2 aplica-se com a mesma constante.
- R3.4 — **Event-driven**: QUANDO um barbeiro criar agendamento via
  `createAppointmentByBarber`, ENTÃO o limite NÃO DEVE ser aplicado (override
  operacional do staff).
- R3.5 — **Ubiquitous**: O hook `useBooking` DEVE mapear `CLIENT_LIMIT_REACHED`
  para mensagem i18n `booking.slotErrors.clientLimitReached` parametrizada por
  `{max}`.
- R3.6 — **Unwanted-behavior**: SE a contagem for feita fora da transação,
  ENTÃO NÃO atende R3 (a verificação DEVE ocorrer dentro do mesmo
  `prisma.$transaction` que o insert do `Appointment`).

**Aceitação**

- Teste: cliente com 3 agendamentos futuros → 4º retorna `CLIENT_LIMIT_REACHED`.
- Teste: guest com 3 pelo telefone normalizado → idem.
- Teste: barbeiro cria pelo painel → sem bloqueio.
- Teste: agendamentos passados/`CANCELLED`/`NO_SHOW`/`COMPLETED` não contam.

## Requisito R4 — Cliente não pode reservar 2 barbeiros no mesmo horário

**User Story**

> Como operador da barbearia, quero impedir que um mesmo cliente faça duas
> reservas sobrepostas com barbeiros diferentes, para evitar dupla ocupação e
> conflitos de capacidade.

**EARS**

- R4.1 — **Ubiquitous**: O sistema DEVE identificar um "cliente" por uma chave
  única derivada:
  - cliente autenticado → `clientId` (UUID do `Profile`);
  - guest → `normalizePhoneDigits(phone)` prefixado com literal `"guest:"`.
- R4.2 — **Event-driven**: QUANDO `createAppointment`,
  `createGuestAppointment` ou `createAppointmentByBarber` for chamado, ENTÃO
  DENTRO da mesma transação DEVE ser adquirido um advisory lock adicional
  `pg_advisory_xact_lock(hashtext(clientKey), hashtext(dateKey))`, SEM
  substituir o lock por barbeiro existente (`lockBarberDateForBooking`). Os
  dois locks coexistem na transação.
- R4.3 — **Event-driven**: QUANDO o lock for adquirido, ENTÃO o serviço DEVE
  verificar via `prisma.appointment.findFirst` se o cliente já possui
  agendamento `CONFIRMED` cujo intervalo `[startTime, endTime)` se sobrepõe ao
  `[newStart, newEnd)` na mesma `date`. SE existir, ENTÃO responder
  `CLIENT_DOUBLE_BOOKING` (HTTP 409).
- R4.4 — **Ubiquitous**: A ordem de aquisição DEVE ser determinística para
  evitar deadlock: primeiro `lockBarberDateForBooking`, depois lock por
  cliente.
- R4.5 — **Unwanted-behavior**: SE duas requisições concorrentes do mesmo
  cliente tentarem reservar barbeiros diferentes para o mesmo intervalo,
  ENTÃO apenas uma DEVE ter sucesso; a outra DEVE receber
  `CLIENT_DOUBLE_BOOKING` sem deadlock.
- R4.6 — **Ubiquitous**: `createAppointmentByBarber` DEVE aplicar a mesma
  verificação (o staff ainda não pode ocupar o cliente em dois lugares).

**Aceitação**

- Teste: cliente autenticado tenta 2º agendamento com barbeiro B no mesmo
  intervalo que já reservou com barbeiro A → 409 `CLIENT_DOUBLE_BOOKING`.
- Teste: mesmo com guest por telefone.
- Teste de concorrência: duas promessas disparadas em paralelo resultam em 1
  sucesso + 1 falha.
- Teste: agendamentos em intervalos não sobrepostos no mesmo dia NÃO são
  bloqueados.

## Requisito R5 — Remoção de símbolos deprecated

**User Story**

> Como mantenedor, quero remover `getGuestAppointments(phone)` e
> `canCancelBeforeStart(minutes)` sem quebrar a API pública, para reduzir
> superfície de ataque e dívida técnica.

**EARS**

- R5.1 — **Ubiquitous**: `src/services/booking.ts` NÃO DEVE mais exportar
  `getGuestAppointments`.
- R5.2 — **Ubiquitous**: `src/lib/booking/cancellation.ts` NÃO DEVE mais
  exportar `canCancelBeforeStart` nem `shouldWarnLateCancellation`.
- R5.3 — **Event-driven**: QUANDO os testes em `src/services/__tests__` ou
  `src/lib/booking/__tests__` usarem esses símbolos, ENTÃO DEVEM ser removidos
  ou reescritos em torno dos substitutos (`getGuestAppointmentsByToken`,
  `canClientCancelOutsideWindow`).
- R5.4 — **Unwanted-behavior**: Não DEVE haver nenhum endpoint público que
  dependa dos símbolos removidos — já confirmado: `src/app/api/appointments/guest/lookup/route.ts`
  usa `getGuestAppointmentsByToken`.
- R5.5 — **Ubiquitous**: A lista de exports públicos da feature booking antes
  e depois da remoção DEVE ser documentada no PR (verificação manual + grep
  test).

**Aceitação**

- `pnpm lint` e `pnpm test` passam.
- `grep -R "getGuestAppointments\b" src/` e
  `grep -R "canCancelBeforeStart\b" src/` retornam zero matches.

## Traceability (resumo)

| Requisito | Tipo     | Arquivos principais                                         |
| --------- | -------- | ----------------------------------------------------------- |
| R1        | UI/API   | `lead-time.ts`, `appointments/route.ts`, `useBooking.ts`, `i18n/**/booking.json` |
| R2        | Service  | `api/barbers/me/absences/route.ts`, `services/notification.ts`, `config/feature-flags.ts` |
| R3        | Service  | `services/booking.ts` (createAppointment, createGuestAppointment), `useBooking.ts` |
| R4        | Service  | `services/booking.ts` (lock cliente), `validations/booking.ts` |
| R5        | Refactor | `services/booking.ts`, `lib/booking/cancellation.ts`, testes |
