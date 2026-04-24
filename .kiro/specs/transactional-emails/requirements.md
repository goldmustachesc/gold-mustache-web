# Documento de Requisitos — Transactional Emails

## Introdução

Hoje o sistema só tem notificações **in-app** (tabela `notifications` + `src/services/notification.ts`). Quem fez agendamento autenticado recebe um card no app; **guests não recebem nada** — crítico, pois são o público-alvo da conversão pública de booking. A auditoria de 2026-04-15 classifica "Notificações" em 6.0/10 e lista o item **P1 #5 — Sem email transacional (confirmação, cancelamento, lembrete)** como principal lacuna da área.

Esta spec cobre o canal **email transacional** (confirmação, cancelamento, lembrete 24h) com template brandado, suporte a i18n (pt-BR / en / es), compliance LGPD, opt-out por usuário, fila idempotente com retry e handling de bounces. Habilita a spec irmã `appointment-reminders-cron`, que consome o wrapper `sendEmail` para disparar o lembrete diário.

## Glossário

- **Transactional email**: email disparado em resposta direta a uma ação do usuário (agendou, cancelou) ou evento sistêmico (lembrete). Não é marketing.
- **Guest**: cliente não autenticado que agendou via fluxo público (`GuestClient`, tem `phone` mas hoje **não tem email**).
- **Resend**: provedor de email escolhido (SDK TS tipado, boa deliverability LatAm, webhooks de bounce/complaint). Alternativa considerada: Postmark.
- **React Email**: biblioteca para escrever templates de email como componentes React (`.tsx`), renderizados para HTML estático na hora do envio.
- **EmailOutbox**: tabela Prisma que serializa requisições de envio; polled/retried por cron para garantir at-least-once com idempotência.
- **Opt-out**: preferência por usuário para desabilitar canal email (exceto emails legais/críticos).
- **Brand book**: `docs/Brand_Book_Gold_Mustache.md` — fonte de verdade para cores, logo, tom.

## Requisitos

### Requisito 1 — Email de Confirmação de Agendamento

**User Story:** Como cliente (autenticado ou guest) que acabou de agendar, quero receber um email confirmando data/hora/serviço/barbeiro, para ter registro fora do app e saber que o agendamento foi aceito.

#### Critérios de Aceite

1. WHEN `createAppointment` retorna sucesso para cliente autenticado com `Profile.email` válido THEN sistema SHALL enfileirar envio do template `appointment-confirmation` em até 2 segundos após commit da transação.
2. WHEN `createAppointment` retorna sucesso para guest E `GuestClient.email` está presente THEN sistema SHALL enfileirar envio do mesmo template, incluindo link público de cancelamento via `accessToken`.
3. WHEN guest agenda sem informar email THEN sistema SHALL completar o booking normalmente e SHALL NOT enfileirar email (guest opt-out implícito).
4. WHEN email é enviado com sucesso THEN sistema SHALL registrar `EmailOutbox.status = SENT` com `providerMessageId` e `sentAt`.
5. WHEN o envio falha (erro transitório do provedor) THEN sistema SHALL fazer retry com backoff exponencial até 5 tentativas; após isso SHALL marcar `FAILED` e logar para observabilidade.
6. WHEN feature flag `transactionalEmails` está desabilitada THEN sistema SHALL NOT enfileirar nem enviar nada (rollout gradual).
7. O conteúdo do email SHALL conter: nome do cliente, serviço, barbeiro, data formatada em pt-BR (ex.: "quinta-feira, 16 de abril de 2026"), horário, endereço da barbearia, link de cancelamento (para guest via `accessToken`; para autenticado via deep link do app).

### Requisito 2 — Email de Cancelamento

**User Story:** Como cliente cujo agendamento foi cancelado (por mim, pelo barbeiro ou por admin), quero receber confirmação por email, para ter ciência do motivo e dos próximos passos.

#### Critérios de Aceite

1. WHEN `cancelAppointmentByClient`, `cancelAppointmentByBarber` ou `cancelAppointmentByGuestToken` completar com sucesso THEN sistema SHALL enfileirar template `appointment-cancellation`.
2. WHEN cancelamento é feito pelo **barbeiro ou admin** E `cancelReason` está presente THEN o email SHALL incluir o motivo.
3. WHEN cancelamento é feito pelo **cliente** THEN o email SHALL omitir o motivo e usar tom neutro de confirmação.
4. WHEN o cancelamento ocorre com menos de 2 horas de antecedência THEN o email SHALL incluir aviso de política de cancelamento (texto i18n).
5. O email SHALL incluir CTA "Reagendar" apontando para o fluxo público ou privado conforme o tipo de cliente.

### Requisito 3 — Email de Lembrete 24h (integração com cron)

**User Story:** Como cliente, quero receber um lembrete por email 24h antes do meu horário, para evitar esquecer do compromisso.

#### Critérios de Aceite

1. A spec `appointment-reminders-cron` SHALL invocar `sendEmail("appointment-reminder", ...)` deste módulo; este requisito cobre apenas o template e a rota de envio, não o agendamento temporal.
2. WHEN o cron chama `sendEmail` para um appointment que já teve `reminderSentAt` registrado THEN o wrapper SHALL recusar o envio e retornar status `SKIPPED_IDEMPOTENT`.
3. WHEN o template é renderizado THEN SHALL incluir: serviço, barbeiro, data, horário, endereço, link Google Maps, telefone de contato, link de cancelamento.
4. WHEN o cliente tem opt-out de `reminders` THEN sistema SHALL não enfileirar o email.

### Requisito 4 — Template Brandado e Consistente

**User Story:** Como destinatário, quero que o email pareça da Gold Mustache (logo, cores, tipografia), para confiar no remetente e reconhecer a marca.

#### Critérios de Aceite

1. Todos os templates SHALL compartilhar um layout base (`EmailLayout.tsx`) com: header com logo dourado da barbearia, corpo em card branco, footer com endereço, redes sociais, link de descadastro e aviso LGPD.
2. Cores SHALL derivar dos tokens definidos em `barbershopConfig.colors` (gold, darkGold, dark) e espelhar os tokens do brand book.
3. O HTML SHALL ser testado para compatibilidade com Gmail, Outlook (web + app), Apple Mail e Yahoo Mail.
4. O email SHALL incluir versão **plaintext** gerada automaticamente (fallback para clientes sem HTML).
5. O logo SHALL ser servido como PNG absoluto em `public/emails/logo.png` (não usar SVG inline; Gmail remove).

### Requisito 5 — i18n 3 Idiomas (pt-BR / en / es)

**User Story:** Como cliente internacional (a barbearia recebe turistas em Itapema), quero receber email no idioma que escolhi durante o booking.

#### Critérios de Aceite

1. Cada template SHALL ter strings em `src/i18n/locales/{pt-BR,en,es}/emails.json`.
2. A locale usada SHALL ser derivada, em ordem: (a) `Profile.locale` ou `GuestClient.locale` se persistida, (b) header `Accept-Language` do request que originou o booking, (c) `pt-BR` como default.
3. Formatação de data SHALL usar `date-fns` com a locale correspondente (`ptBR`, `enUS`, `es`).
4. Subject line SHALL ser traduzido por idioma (não concatenar strings não traduzidas).

### Requisito 6 — Fila Idempotente e Retry

**User Story:** Como operador, quero que nenhum cliente receba o mesmo email duas vezes nem fique sem receber por falha transitória.

#### Critérios de Aceite

1. Tabela `EmailOutbox` SHALL existir com campos: `id`, `template`, `toEmail`, `locale`, `payload` (JSON), `idempotencyKey` (unique), `status` (PENDING/SENDING/SENT/FAILED/SKIPPED_IDEMPOTENT), `attempts`, `lastAttemptAt`, `sentAt`, `providerMessageId`, `error`, `createdAt`.
2. `idempotencyKey` SHALL ser determinístico: `${template}:${appointmentId}:${eventType}` (ex.: `appointment-confirmation:uuid-abc:created`).
3. WHEN insert falha por violação de `idempotencyKey` unique THEN wrapper SHALL retornar `SKIPPED_IDEMPOTENT` sem erro.
4. Retry SHALL usar backoff exponencial: 1min, 5min, 15min, 1h, 6h; após 5ª tentativa marca `FAILED`.
5. Processamento da fila SHALL ser feito em rota `/api/cron/email-outbox` protegida por `CRON_SECRET`, executada a cada 1 minuto pela Vercel cron.
6. Envio síncrono (fire-and-forget) SHALL ser o **caminho preferencial**; outbox é fallback para quando o provedor estiver fora ou o request de origem for abortado antes do dispatch.

### Requisito 7 — Opt-out e Preferências

**User Story:** Como usuário, quero controlar quais emails recebo (confirmações / cancelamentos / lembretes / marketing) para não ser incomodado.

#### Critérios de Aceite

1. Modelo `Profile` SHALL ganhar campo `emailPreferences` (JSON) com chaves: `confirmations: boolean`, `cancellations: boolean`, `reminders: boolean`, `marketing: boolean`. Default: todos `true` exceto `marketing: false`.
2. WHEN usuário clica em link de descadastro no footer do email THEN SHALL abrir página `/preferencias-email/[token]` (token HMAC com userId) onde pode desabilitar individualmente.
3. Emails **críticos de compliance** (reset de senha, mudança de email) SHALL ignorar opt-out — são legalmente/operacionalmente necessários.
4. Guests SHALL ter link de descadastro granular por telefone/email, armazenado em `GuestClient.emailOptedOutAt`.
5. UI de preferências SHALL estar disponível também em `/perfil/preferencias` para usuários autenticados.

### Requisito 8 — Compliance LGPD

**User Story:** Como responsável legal, quero que todo email transacional cumpra LGPD (Lei 13.709/2018) para não gerar passivo.

#### Critérios de Aceite

1. Footer de todo email SHALL incluir: razão social, endereço físico, contato do controlador (DPO), link para política de privacidade e link de descadastro.
2. O sistema SHALL registrar o consentimento do guest ao capturar email no formulário de booking (checkbox opt-in **não pré-marcado** exigido apenas para marketing; transacional não exige opt-in explícito mas exige opt-out fácil).
3. `EmailOutbox.payload` SHALL minimizar dados pessoais (armazenar IDs, resolver nomes/dados só no momento do render).
4. SHALL existir rota `/api/account/email-history` que retorna histórico de emails enviados a um usuário (direito de acesso LGPD).

### Requisito 9 — Captura de Email no Booking de Guest

**User Story:** Como guest que está agendando, quero (opcionalmente) informar meu email para receber confirmação e lembrete.

#### Critérios de Aceite

1. Schema Prisma `GuestClient` SHALL ganhar campos `email String?` (nullable, validado como email pelo Zod) e `emailOptedOutAt DateTime?`.
2. Formulário de booking público SHALL ter campo email **opcional**, com copy: "Opcional — usamos só para confirmação e lembrete".
3. `createAppointment` (fluxo guest) SHALL persistir o email no `GuestClient` e usá-lo como destinatário dos emails transacionais.
4. WHEN mesmo telefone agenda novamente e um email diferente é informado THEN sistema SHALL atualizar `GuestClient.email` para o mais recente (consent reafirmado).

### Requisito 10 — Bounce e Spam Handling

**User Story:** Como administrador, quero que emails que bounce (hard) parem de ser tentados, para proteger a reputação do domínio.

#### Critérios de Aceite

1. Rota `/api/webhooks/resend` SHALL receber eventos do Resend (`email.delivered`, `email.bounced`, `email.complained`, `email.opened`) e atualizar `EmailOutbox`.
2. WHEN evento é `bounced` do tipo `hard_bounce` THEN sistema SHALL marcar destinatário em `EmailSuppression` (tabela nova) e recusar envios futuros.
3. WHEN evento é `complained` (spam report) THEN sistema SHALL marcar `Profile.emailPreferences.marketing = false` automaticamente e suprimir futuros marketings.
4. Webhook SHALL validar assinatura do Resend (`svix-signature`) antes de processar — sem assinatura válida retorna 401.
5. Métricas (`delivered`, `bounced`, `complained`, `opened`) SHALL ser expostas em `/admin/emails` para monitoramento de reputação.

## Não-Funcionais

- **Performance**: enfileiramento não deve adicionar mais de 50ms ao tempo de resposta de `createAppointment`.
- **Observabilidade**: todos os envios registram log estruturado (`template`, `outboxId`, `attempt`, `status`, `durationMs`).
- **Segurança**: `RESEND_API_KEY` só em server runtime, nunca exposta ao cliente; webhook valida assinatura; token de descadastro é HMAC com segredo.
- **Custo**: free tier Resend = 3.000 emails/mês, 100/dia. Com volume atual da barbearia (~400 agendamentos/mês × 3 emails = 1.200), cabe no free; monitorar crescimento.
