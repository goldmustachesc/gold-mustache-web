# Documento de Requisitos — appointment-reminders-cron

## Visão Geral

Automatizar o envio de lembretes de agendamento 24h antes do horário marcado, substituindo o fluxo manual atual no qual o barbeiro precisa clicar em um link em `POST /api/appointments/[id]/reminder`. Os lembretes serão disparados por um cron job que busca agendamentos CONFIRMED próximos das 24h, envia email (via spec `transactional-emails`) e, opcionalmente, gera envio por WhatsApp. O processo deve ser idempotente, observável e respeitar timezone `America/Sao_Paulo`.

## Contexto

- Prioridade: P1 #7 da auditoria 2026-04-15
- Área: Notificações
- Dependência crítica: `transactional-emails` provê o canal de email
- Risco principal: duplicidade caso o cron execute duas vezes no mesmo horário (retry de scheduler, deploy concorrente)
- Base existente:
  - `src/app/api/appointments/[id]/reminder/route.ts` — lembrete manual atual
  - `src/services/notification.ts` — contém `notifyAppointmentReminder` para notificação in-app
  - `prisma/schema.prisma` — `Appointment` NÃO possui campo `reminderSentAt` atualmente; precisa ser adicionado
  - `vercel.json` — já usa Vercel Cron (hoje apenas `sync-instagram`)
  - Padrão de auth por `CRON_SECRET` já utilizado em `src/app/api/cron/sync-instagram/route.ts`

## Glossário

- **Janela de envio**: intervalo `[agora + 23h, agora + 25h]` em `America/Sao_Paulo` no qual um agendamento CONFIRMED se torna elegível para receber lembrete
- **Email opt-in**: cliente com email verificado (`Profile.emailVerified = true`) e que não tenha optado por recusar comunicações transacionais
- **Idempotência**: garantia de que uma mesma execução lógica (mesma janela) nunca gera dois envios para o mesmo agendamento

## Requisitos

### Requisito 1 — Agendamento do Cron

**User Story:** Como plataforma, quero disparar o processo de lembretes em intervalo regular para que agendamentos do dia seguinte sejam lembrados automaticamente sem intervenção humana.

#### Critérios de Aceitação (EARS)

1. QUANDO o scheduler Vercel Cron disparar o endpoint configurado, ENTÃO o sistema DEVE iniciar uma execução de `processReminderBatch()`.
2. O intervalo padrão DEVE ser de 15 minutos (`*/15 * * * *`), configurável via `vercel.json`.
3. QUANDO a feature flag `appointmentReminders` estiver desabilitada, ENTÃO o endpoint DEVE retornar 200 com `skipped: true` sem processar nenhum agendamento.
4. O cron DEVE ser executável manualmente por um admin via chamada HTTP autenticada para fins de operação/hotfix.

### Requisito 2 — Seleção de Agendamentos Elegíveis

**User Story:** Como sistema, quero identificar exatamente os agendamentos que precisam receber lembrete agora para que o envio ocorra ~24h antes do horário marcado.

#### Critérios de Aceitação (EARS)

1. O serviço DEVE selecionar agendamentos com `status = CONFIRMED`.
2. O serviço DEVE selecionar agendamentos cujo `date + startTime` (convertido para `America/Sao_Paulo`) esteja dentro da janela `[agora + 23h, agora + 25h]`.
3. O serviço DEVE filtrar agendamentos que já possuam `reminderSentAt != null`.
4. QUANDO houver cliente registrado (`clientId != null`), ENTÃO o serviço DEVE considerar envio por email se o `Profile` tiver email e `emailVerified = true`.
5. QUANDO for guest client (`guestClientId != null`), ENTÃO o serviço DEVE considerar fluxo alternativo (WhatsApp deep link) pois guest client não possui email.
6. A consulta DEVE usar `select`/`include` mínimos para não carregar dados desnecessários (princípio de segurança do projeto).

### Requisito 3 — Envio de Email

**User Story:** Como cliente com email cadastrado, quero receber um email de lembrete 24h antes do meu agendamento para não esquecer do compromisso.

#### Critérios de Aceitação (EARS)

1. QUANDO o cliente for elegível para email, ENTÃO o sistema DEVE enviar email transacional via serviço de `transactional-emails` com template `appointment-reminder`.
2. O payload DEVE conter: nome do cliente, nome do serviço, nome do barbeiro, data formatada `dd/mm/yyyy`, horário `HH:mm`, endereço da barbearia e link para cancelamento.
3. SE o envio de email falhar com erro transitório (timeout, 5xx do provider), ENTÃO o sistema DEVE aplicar retry com backoff exponencial até 3 tentativas por agendamento.
4. SE o envio falhar definitivamente após retries, ENTÃO o sistema NÃO DEVE marcar `reminderSentAt` e DEVE registrar erro estruturado para retomada na próxima execução.
5. O sistema DEVE respeitar rate limit do provider de email (ex: Resend ~10 req/s) usando enfileiramento ou `Promise.allSettled` em chunks.

### Requisito 4 — Envio por WhatsApp (Opcional)

**User Story:** Como barbearia, quero opcionalmente notificar clientes via WhatsApp quando não houver email disponível para maximizar alcance do lembrete.

#### Critérios de Aceitação (EARS)

1. QUANDO a feature flag `appointmentRemindersWhatsapp` estiver habilitada E o cliente possuir telefone, ENTÃO o sistema DEVE disparar envio via WhatsApp.
2. Na modalidade `deep-link`, o sistema DEVE apenas registrar o link `wa.me` em `Notification` para que o barbeiro envie manualmente (preserva fluxo atual).
3. Na modalidade `business-api`, o sistema DEVE chamar a WhatsApp Business API oficial com template aprovado (fora do MVP; campo reservado em config).
4. Falha de WhatsApp NÃO DEVE impedir marcação de `reminderSentAt` se o email foi enviado com sucesso.

### Requisito 5 — Idempotência

**User Story:** Como operador, quero garantir que mesmo se o cron rodar duas vezes simultaneamente nenhum cliente receberá dois lembretes.

#### Critérios de Aceitação (EARS)

1. O sistema DEVE usar PostgreSQL advisory lock (`pg_try_advisory_lock`) com chave estável (ex: hash de `appointment-reminders-cron`) no início da execução.
2. QUANDO o lock não for obtido, ENTÃO o sistema DEVE retornar 200 com `skipped: true, reason: 'already_running'` e encerrar sem processar.
3. Para cada agendamento, a marcação de `reminderSentAt` DEVE ocorrer dentro da mesma transação do envio bem-sucedido, usando `UPDATE ... WHERE reminderSentAt IS NULL` para prevenir race condition.
4. Duas execuções concorrentes na mesma janela NÃO DEVEM produzir dois registros de email enviado para o mesmo agendamento.

### Requisito 6 — Timezone

**User Story:** Como barbearia em Itapema/SC, quero que o cálculo de "24h antes" respeite o fuso horário local.

#### Critérios de Aceitação (EARS)

1. Todos os cálculos de janela DEVEM usar `America/Sao_Paulo` como timezone de referência.
2. A conversão entre `Appointment.date` (DATE em UTC) e `startTime` (string `HH:mm`) para um timestamp com timezone DEVE ser centralizada em utilitário testado (ex: `src/utils/datetime.ts`).
3. QUANDO houver horário de verão (caso futuro), ENTÃO a janela ainda DEVE representar 24h reais antes do evento local.

### Requisito 7 — Autenticação do Endpoint

**User Story:** Como plataforma, quero que apenas o scheduler Vercel possa invocar o endpoint de cron para evitar abuso externo.

#### Critérios de Aceitação (EARS)

1. O endpoint `POST /api/cron/appointment-reminders` DEVE exigir header `Authorization: Bearer ${CRON_SECRET}`.
2. QUANDO `CRON_SECRET` não estiver configurado, ENTÃO o endpoint DEVE retornar 500 com código `CONFIG_ERROR`.
3. QUANDO o header estiver ausente ou inválido, ENTÃO o endpoint DEVE retornar 401 com código `UNAUTHORIZED`.
4. O endpoint DEVE validar origem (ou usar o mesmo padrão de `src/lib/api/verify-origin.ts` adaptado para cron) para bloquear CSRF.

### Requisito 8 — Observabilidade

**User Story:** Como operador, quero métricas e logs para saber quantos lembretes foram enviados, falharam ou foram pulados.

#### Critérios de Aceitação (EARS)

1. Cada execução DEVE produzir log estruturado JSON com: `executionId`, `startedAt`, `finishedAt`, `eligibleCount`, `sentCount`, `failedCount`, `skippedCount`.
2. Cada falha individual DEVE produzir log com `appointmentId`, `errorCode`, `errorMessage` (sem PII sensível).
3. O endpoint DEVE retornar resumo (`{ sent, failed, skipped }`) no body de resposta 200 para inspeção manual.
4. Logs NÃO DEVEM expor endereço de email completo; usar máscara (`j***@example.com`).
5. Métricas DEVEM ser compatíveis com integração futura de Sentry/Logflare (usar `console.log` estruturado por ora).

### Requisito 9 — Feature Flag

**User Story:** Como admin, quero ativar ou desativar a automação via flag sem redeploy para controle de incidentes.

#### Critérios de Aceitação (EARS)

1. A flag `appointmentReminders` (tabela `FeatureFlag`) DEVE controlar o dispatch geral do cron.
2. A flag `appointmentRemindersWhatsapp` DEVE controlar apenas o canal WhatsApp independentemente do email.
3. QUANDO qualquer flag for alterada, ENTÃO o efeito DEVE ser aplicado na próxima execução sem restart de servidor.
4. As flags DEVEM ter `description` clara cadastrada no seed.

### Requisito 10 — Rastreabilidade e Traceability

**User Story:** Como auditor, quero saber exatamente quais agendamentos já receberam lembrete para investigação de incidentes e compliance.

#### Critérios de Aceitação (EARS)

1. O campo `Appointment.reminderSentAt` (DateTime, nullable) DEVE ser preenchido com o timestamp UTC do envio bem-sucedido.
2. QUANDO email e WhatsApp forem ambos enviados, ENTÃO `reminderSentAt` DEVE refletir o primeiro canal concluído com sucesso.
3. Opcional (fora do MVP): registrar em `Notification` com `type = APPOINTMENT_REMINDER` e `data` contendo `channel: 'email' | 'whatsapp'` para histórico por usuário.
4. Testes DEVEM validar que nenhum agendamento processado fica sem rastro.

## Requisitos Não-Funcionais

- **Performance**: execução deve terminar em < 60s para até 500 agendamentos elegíveis (limite prático Vercel Cron).
- **Segurança**: sem `any`, validação Zod no payload de resposta, sem stack traces ao cliente.
- **Compatibilidade**: manter o endpoint manual `POST /api/appointments/[id]/reminder` funcionando para casos excepcionais.
- **TypeScript**: tipos explícitos em serviço, rota e DTOs; `pnpm test:gate` verde antes de PR.

## Fora de Escopo

- Implementação do canal de email (responsabilidade de `transactional-emails`)
- WhatsApp Business API oficial (apenas interface e flag reservada)
- Lembretes com antecedências diferentes (ex: 2h, 1 semana)
- Preferências granulares de opt-out por cliente (usa `emailVerified` como proxy nesta primeira versão)
