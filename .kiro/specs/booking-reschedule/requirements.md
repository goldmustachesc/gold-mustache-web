# Documento de Requisitos - Booking Reschedule

## Introducao

Atualmente, quando um cliente precisa alterar barbeiro, data ou horario de um agendamento confirmado, o unico caminho e cancelar o agendamento existente e criar um novo. Isso tem dois problemas criticos:

1. O FAQ publico (ver `faq-section`) promete a funcionalidade "Remarcar agendamento" que nao existe.
2. O cancelamento de cliente e bloqueado dentro da janela de 2 horas antes do horario (`CANCELLATION_BLOCK_WINDOW_MINUTES` em `src/lib/booking/cancellation.ts:1`), mesmo quando o cliente quer apenas mover o horario para mais tarde - ou seja, o cliente perde totalmente a capacidade de ajustar seu proprio agendamento proximo ao horario.

Esta spec adiciona a capacidade de **remarcar** (`reschedule`) um agendamento em uma unica operacao atomica, preservando a identidade do agendamento (mesmo `Appointment.id`, status permanece `CONFIRMED`), verificando disponibilidade do novo slot com advisory lock, e reaproveitando as politicas puras ja existentes em `src/lib/booking/` (overlap, working hours, shop closures, barber absences, lead time). A feature atende cliente autenticado (`Profile`), guest (`GuestClient`, via `accessToken`) e staff (`Barber`/admin).

## Glossario

- **Reschedule**: Operacao que altera `barberId`, `date` e/ou `startTime` (e consequentemente `endTime`) de um `Appointment` existente com status `CONFIRMED`, sem mudar seu `id` nem seu `status`.
- **Reschedule Window**: Janela minima antes do horario original em que o cliente ainda pode remarcar pelo self-service. Reaproveita `CLIENT_BOOKING_LEAD_MINUTES` (90min) como limite sobre o **novo** slot e `CANCELLATION_BLOCK_WINDOW_MINUTES` (2h) como limite sobre o **slot original** para self-service de cliente/guest.
- **Staff**: Perfis com permissao de bypass da janela de reschedule (barbeiro dono do agendamento ou admin). Alinhado com a spec `admin-appointment-management`.
- **Advisory Lock**: `pg_advisory_xact_lock` aplicado em `(barberId, date)` do novo slot, igual ao ja usado em `lockBarberDateForBooking` (`src/services/booking.ts:200`).
- **Same-Slot Reschedule**: Remarcar para exatamente o mesmo barbeiro + data + horario do slot atual. Deve ser rejeitado com erro `RESCHEDULE_UNCHANGED`.

## Requisitos

### Requirement 1 - Cliente autenticado pode remarcar o proprio agendamento

**User Story:** Como cliente autenticado, quero remarcar um agendamento confirmado (trocando barbeiro, data ou horario), para nao precisar cancelar e criar do zero.

#### Acceptance Criteria (EARS)

1. WHEN o cliente autenticado solicita reschedule de um `Appointment` onde `clientId == profile.id` e `status == CONFIRMED` E ainda falta mais do que `CANCELLATION_BLOCK_WINDOW_MINUTES` para o `startTime` **original** THEN o Booking_System SHALL aceitar a solicitacao de reschedule.
2. WHEN o cliente autenticado solicita reschedule com menos de `CANCELLATION_BLOCK_WINDOW_MINUTES` para o `startTime` original THEN o Booking_System SHALL rejeitar a operacao com erro `RESCHEDULE_BLOCKED_WINDOW`.
3. WHEN o cliente autenticado solicita reschedule de um agendamento que nao lhe pertence THEN o Booking_System SHALL rejeitar com `UNAUTHORIZED` e sem vazar existencia do recurso (comportamento identico a `cancelAppointmentByClient` em `src/services/booking.ts:1330`).
4. WHEN o cliente autenticado solicita reschedule para um slot cujo `startTime` novo esta a menos de `CLIENT_BOOKING_LEAD_MINUTES` do instante atual (ver `src/lib/booking/lead-time.ts:1`) THEN o Booking_System SHALL rejeitar com `SLOT_TOO_SOON`.
5. WHEN o agendamento alvo tem `status != CONFIRMED` THEN o Booking_System SHALL rejeitar com `APPOINTMENT_NOT_RESCHEDULABLE`.
6. WHEN o novo `(barberId, date, startTime)` e identico ao slot atual THEN o Booking_System SHALL rejeitar com `RESCHEDULE_UNCHANGED`.

### Requirement 2 - Guest pode remarcar via token

**User Story:** Como cliente guest (sem login), quero remarcar meu agendamento usando o token de acesso salvo no dispositivo, para nao perder a flexibilidade que um cliente autenticado tem.

#### Acceptance Criteria (EARS)

1. WHEN uma requisicao chega com header `X-Guest-Token` valido E o `Appointment.guestClientId` corresponde ao guest resolvido pelo token (mesma logica de `getGuestClientByActiveToken` em `src/services/booking.ts:1826`) THEN o Booking_System SHALL aceitar o reschedule respeitando todas as politicas de tempo do Requirement 1.
2. WHEN o token esta ausente ou ja consumido THEN o Booking_System SHALL responder `MISSING_TOKEN` (401) ou `GUEST_TOKEN_CONSUMED` (401) respectivamente.
3. WHEN o guest tenta remarcar um agendamento que pertence a outro guest/cliente THEN o Booking_System SHALL responder `UNAUTHORIZED` (403).
4. WHEN o reschedule de guest e aceito THEN o Booking_System SHALL aplicar rate limit via `checkRateLimit("guestAppointments", ...)` identico ao usado em guest cancel (`src/app/api/appointments/guest/[id]/cancel/route.ts:17`).

### Requirement 3 - Staff (admin/barbeiro) pode remarcar sem restricao de janela

**User Story:** Como barbeiro ou admin, quero remarcar qualquer agendamento que esteja sob minha responsabilidade sem a janela de 2h, para atender imprevistos operacionais (atraso do barbeiro, emergencia do cliente).

#### Acceptance Criteria (EARS)

1. WHEN a requisicao vem com `actor == "barber"` E o usuario autenticado e o `Barber` dono do agendamento THEN o Booking_System SHALL aceitar o reschedule ignorando `CANCELLATION_BLOCK_WINDOW_MINUTES` e `CLIENT_BOOKING_LEAD_MINUTES`, mas ainda validando overlap, shop hours, working hours, absences e closures.
2. WHEN a requisicao vem com perfil admin (conforme spec `admin-appointment-management`) THEN o Booking_System SHALL aceitar o reschedule para qualquer barbeiro (inclusive trocando barbeiro do agendamento).
3. WHEN staff tenta remarcar um agendamento cujo novo slot viola `SHOP_CLOSED`, `BARBER_UNAVAILABLE` ou `SLOT_UNAVAILABLE` THEN o Booking_System SHALL rejeitar com o mesmo codigo de erro ja usado em `createAppointment` (`src/services/booking.ts:619`).
4. WHEN o staff usa bypass, uma razao (`reason`) opcional mas recomendada pode ser registrada no historico de auditoria (Requirement 7).

### Requirement 4 - Verificacao de disponibilidade do novo slot com advisory lock

**User Story:** Como sistema, preciso garantir que dois clientes concorrentes nao consigam remarcar para o mesmo slot, reutilizando o mecanismo ja provado em create.

#### Acceptance Criteria (EARS)

1. WHEN o Booking_System processa um reschedule THEN ele SHALL abrir uma unica `prisma.$transaction` e emitir `pg_advisory_xact_lock(hashtext(newBarberId), hashtext(newDate))` via o helper existente `lockBarberDateForBooking` (`src/services/booking.ts:200`).
2. WHEN o novo `(barberId, date)` difere do antigo THEN o Booking_System SHALL tomar locks em ordem deterministica (ordenacao lexicografica de `barberId`+`date`) para evitar deadlocks entre reschedules cruzados.
3. WHEN o novo slot se sobrepoe a qualquer `Appointment` com `status == CONFIRMED` (exceto o proprio agendamento em reschedule) THEN o Booking_System SHALL rejeitar com `SLOT_OCCUPIED` usando `hasOverlappingAppointment` com filtro adicional `id != currentAppointmentId` (`src/services/booking.ts:226`).
4. WHEN o novo slot viola working hours, shop hours, closures ou absences THEN o Booking_System SHALL rejeitar reutilizando `getBookingPolicyError` (`src/services/booking.ts:56`) e retornar `SHOP_CLOSED`, `BARBER_UNAVAILABLE` ou `SLOT_UNAVAILABLE`.

### Requirement 5 - Idempotencia e atomicidade (transacao unica)

**User Story:** Como sistema, preciso garantir que o cliente nunca fique sem slot (nem com dois slots) mesmo em falha parcial.

#### Acceptance Criteria (EARS)

1. WHEN o Booking_System aceita um reschedule THEN a atualizacao do `Appointment` (novos `barberId`, `date`, `startTime`, `endTime`, `updatedAt`) e a insercao do registro de historico (Requirement 7) SHALL ocorrer na **mesma** `prisma.$transaction`.
2. IF qualquer etapa interna falha (lock, overlap, update, audit) THEN o Booking_System SHALL fazer rollback e o `Appointment` original permanece inalterado (`status` e slot originais preservados).
3. WHEN a requisicao inclui header `Idempotency-Key` THEN o Booking_System SHALL retornar o resultado da primeira execucao bem-sucedida em requisicoes subsequentes com a mesma chave, em uma janela de 5 minutos. (Nao bloqueante para o MVP: a spec permite implementacao em fase posterior desde que marcada como `@todo` em `tasks.md`.)
4. WHEN dois requests concorrentes disputam o mesmo slot alvo THEN apenas um SHALL sair com sucesso; o outro SHALL receber `SLOT_OCCUPIED` (nao timeout).
5. O `status` do `Appointment` SHALL permanecer `CONFIRMED` apos um reschedule bem-sucedido. O Booking_System SHALL NOT emitir eventos de `CANCELLED_BY_*` como efeito colateral.

### Requirement 6 - Notificacao cruzada (cliente + barbeiro)

**User Story:** Como cliente e como barbeiro, quero ser notificado quando um agendamento envolvendo minha agenda for remarcado.

#### Acceptance Criteria (EARS)

1. WHEN um reschedule e commitado com sucesso THEN o Booking_System SHALL enviar uma notificacao `APPOINTMENT_RESCHEDULED` ao cliente autenticado (quando `clientId` existe), reusando `createNotification` em `src/services/notification.ts:41` com payload contendo `{ serviceName, barberName, oldDate, oldTime, newDate, newTime, actor }`.
2. WHEN o reschedule troca o `barberId` THEN o Booking_System SHALL notificar o barbeiro **antigo** (agendamento removido da agenda) E o barbeiro **novo** (agendamento adicionado).
3. WHEN o reschedule mantem o `barberId` THEN o Booking_System SHALL notificar o barbeiro uma unica vez com a mudanca de data/horario.
4. WHEN o `Appointment` e de guest (sem `clientId`) THEN o Booking_System SHALL omitir a notificacao de cliente (guest nao tem canal), mas manter a(s) notificacao(oes) de barbeiro.
5. Falha de notificacao SHALL NOT reverter o reschedule (notificacao e lateral, dentro de `try/catch`, conforme padrao atual do projeto).

### Requirement 7 - Historico / audit do reschedule

**User Story:** Como barbeiro e admin, quero ver o historico de remarcacoes de um agendamento para entender seu ciclo de vida.

#### Acceptance Criteria (EARS)

1. WHEN o schema Prisma e atualizado THEN ele SHALL incluir uma tabela `AppointmentReschedule` com campos minimos: `id`, `appointmentId`, `previousBarberId`, `previousDate`, `previousStartTime`, `previousEndTime`, `newBarberId`, `newDate`, `newStartTime`, `newEndTime`, `rescheduledBy` (enum `CLIENT` | `GUEST` | `BARBER` | `ADMIN`), `actorUserId` (nullable), `reason` (nullable), `createdAt`.
2. WHEN um reschedule e aceito THEN o Booking_System SHALL inserir um registro em `AppointmentReschedule` dentro da mesma transacao do update.
3. WHEN o barbeiro/admin consulta o `Appointment` THEN o Booking_System SHALL poder retornar seu historico de reschedules ordenado por `createdAt` desc (API de leitura nao obrigatoria para o MVP, mas o dado DEVE ser persistido desde ja).
4. O campo `Appointment.updatedAt` SHALL refletir a hora da ultima alteracao (comportamento padrao do `@updatedAt` do Prisma).

### Requirement 8 - Pontos de fidelidade nao penalizam reschedule

**User Story:** Como cliente fidelizado, nao quero perder pontos por remarcar um agendamento.

#### Acceptance Criteria (EARS)

1. WHEN um reschedule e aceito THEN o Booking_System SHALL NOT debitar pontos, NOT marcar `NO_SHOW`, NOT disparar `LoyaltyService.penalizePoints`.
2. WHEN o agendamento for posteriormente concluido (`markAppointmentAsCompleted`) THEN o Booking_System SHALL premiar pontos com base no `serviceId` e `barberId` atuais apos o reschedule (e nao os originais).
3. WHEN houver registro em `AppointmentReschedule` para o agendamento THEN o calculo de pontos SHALL ignorar esse historico (reschedule e neutro para loyalty).
4. WHEN uma politica futura decidir limitar "excesso de reschedules" (anti-abuso) THEN a contagem SHALL ser derivavel da tabela `AppointmentReschedule` (por `clientId`/`guestClientId` em janela configuravel). Nao obrigatorio para o MVP.
