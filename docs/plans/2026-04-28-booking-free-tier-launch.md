# Plano técnico — booking com stack free tier no launch

## Objetivo

Subir o fluxo de agendamento em produção usando apenas ferramentas grátis ou com free tier confortável no início, sem depender de upgrade imediato de Vercel ou GitHub.

## Decisão final

- **Hosting web:** Vercel Hobby.
- **Logs estruturados:** `pino` em stdout + Vercel Runtime Logs.
- **Error tracking:** Sentry Developer Free.
- **Email transacional:** Resend Free.
- **Reminder automático 24h:** GitHub Actions chamando `POST /api/cron/appointment-reminders` a cada 15 minutos.
- **WhatsApp no launch:** deeplink manual no painel do barbeiro.
- **WhatsApp automatizado:** fora do launch. Twilio/Meta API vira fase 2.
- **Rate limit distribuído:** Upstash Redis Free.

## Por que essa stack

### Vercel Hobby

- Aceita cron diário, mas nao aceita cron sub-diário.
- Serve bem para `sync-instagram` e jobs diários de loyalty.
- Nao serve para lembrete de 24h a cada 15 ou 30 minutos.

### GitHub Actions Free

- Este repositório é **público**, então GitHub Actions é gratuito para esse agendamento.
- O workflow atual já existe, já autentica com `CRON_SECRET` e já tem retry de rede.
- Mantém o endpoint HTTP igual, sem acoplamento novo.

### Sentry Developer Free

- Limites atuais: `5k errors/mês`, `5GB logs`, `5M spans`, `1 cron monitor`, retenção de `30 dias`, `1 usuário`.
- Suficiente para launch de barbearia pequena/média.
- O `Cron Monitor` grátis pode vigiar o workflow de lembretes sem contratar outro serviço.

### Resend Free

- Limites atuais: `3.000 emails/mês`, `100/dia`, `1 domínio`.
- Bom para confirmação + cancelamento + lembrete de clientes com email no início.
- Se o volume passar de `100/dia`, sobe para plano pago ou migra canal.

### Upstash Redis Free

- Limites atuais: `256 MB` e `500k comandos/mês`.
- Suficiente para rate limit e cache leve no launch.
- Precisa monitorar uso se o tráfego crescer ou se mais features passarem a usar Redis.

## Ajustes necessários no repositório

### 1. Scheduler de reminders

- Remover `/api/cron/appointment-reminders` do `vercel.json`.
- Manter `.github/workflows/appointment-reminders.yml` como fonte oficial do schedule.
- Deixar no `vercel.json` apenas os jobs diários compatíveis com Hobby.

### 2. Documentação operacional

- Atualizar `docs/ops/appointment-reminders.md` para refletir GitHub Actions como scheduler oficial.
- Atualizar `docs/environment-variables.md` e `.env.example` com Resend, Sentry e feature flags operacionais.

### 3. Rollout controlado

- `FEATURE_FLAG_TRANSACTIONAL_EMAILS=false` até validar domínio e inbox.
- `FEATURE_FLAG_APPOINTMENT_REMINDERS=false` até validar cron em staging/manual e produção.
- `FEATURE_FLAG_APPOINTMENT_REMINDERS_WHATSAPP=false` até decidir se reminder manual por WhatsApp entra no launch.

## Plano de execução

### Fase 1 — alinhar infra grátis

1. Remover o cron sub-diário da Vercel.
2. Confirmar secrets no GitHub Actions: `CRON_SECRET` e `APPOINTMENT_REMINDERS_URL`.
3. Confirmar secrets no Vercel: `CRON_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.
4. Confirmar secrets de email: `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`.

### Fase 2 — validar operação

1. Disparar `workflow_dispatch` do reminder em produção ou staging controlado.
2. Confirmar `401` sem secret e `200` com secret no endpoint.
3. Confirmar que um appointment elegível recebe email e marca `reminderSentAt`.
4. Confirmar que segunda execução nao duplica lembrete.
5. Forçar erro controlado e conferir captura no Sentry.

### Fase 3 — observabilidade mínima

1. Criar alertas por email no Sentry para erro novo e erro recorrente.
2. Conectar 1 `Cron Monitor` do Sentry ao workflow `appointment-reminders`.
3. Registrar runbook curto: falha no cron, falha no Resend, falha no booking.

## Regras de go-live

- Reminder automático de guests continua **nao automatizado por WhatsApp** no launch.
- Guest recebe cobertura manual via deeplink no painel do barbeiro.
- Cliente com email recebe confirmação/cancelamento/lembrete via Resend.
- Se Resend nao estiver pronto, launch ainda é possível com reminders manuais, mas isso aumenta risco operacional.

## Riscos aceitos no launch

### Reminder de guest sem API oficial de WhatsApp

- Risco aceito: barbeiro depende de ação manual para alguns contatos.
- Mitigação: deeplink pronto no painel + reminder interno para equipe.

### Scheduler baseado em GitHub Actions

- Risco aceito: dependência de runner externo.
- Mitigação: repo público, retry no workflow, endpoint idempotente, advisory lock, monitor no Sentry.

### Limite diário do Resend Free

- Risco aceito: teto de `100/dia`.
- Mitigação: acompanhar volume real no primeiro mês e subir plano só se necessário.

## Fase 2 paga quando houver caixa

1. Twilio ou WhatsApp Business API para guest reminder automático.
2. Vercel Pro se fizer sentido consolidar todos os crons na mesma plataforma.
3. Log drain dedicado se Vercel Logs + Sentry deixarem de bastar.
