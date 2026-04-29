# Appointment Reminders — Ops Guide

## Overview

`POST /api/cron/appointment-reminders` continua sendo o endpoint de negócio que processa lembretes.

Na stack inicial gratuita, o scheduler oficial desse endpoint é o GitHub Actions.
Motivo: Vercel Hobby só aceita cron diário; lembretes precisam rodar a cada 15 minutos.
Os outros jobs diários continuam no `vercel.json` porque são compatíveis com Hobby.

## Scheduling

| Environment | Scheduler | Frequency | Notes |
|-------------|-----------|-----------|-------|
| Production | GitHub Actions | Every 15 minutes | Runs from the public repo on the default branch (`main`) |
| Staging | Manual only | N/A | Use direct `curl` or `workflow_dispatch` for ad hoc validation |

## Required Secrets

| Secret | Scope | Purpose |
|--------|-------|---------|
| `CRON_SECRET` | GitHub Actions + app runtime | Shared authorization token for the endpoint |
| `APPOINTMENT_REMINDERS_URL` | GitHub Actions | Production URL called by the scheduler |

Exemplo:

```bash
CRON_SECRET=...
APPOINTMENT_REMINDERS_URL=https://www.goldmustachebarbearia.com.br/api/cron/appointment-reminders
```

## Manual Validation

```bash
# Health/auth check
curl -i https://staging.goldmustachebarbearia.com.br/api/cron/appointment-reminders

# Authorized run
curl -X POST https://staging.goldmustachebarbearia.com.br/api/cron/appointment-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

O endpoint deve retornar:
- `401` sem `Authorization`
- `200` com o secret compartilhado

## Operational Notes

- O workflow já usa `curl --retry 3 --retry-all-errors`, então falhas transitórias de rede nao exigem mudança no endpoint.
- Manter staging manual evita disparo recorrente acidental fora da produção.
- Se o scheduler mudar no futuro, atualizar apenas `.github/workflows/appointment-reminders.yml` e o secret `APPOINTMENT_REMINDERS_URL`.
- Melhoria recomendada pós-launch: usar 1 `Cron Monitor` do Sentry Free para detectar falha silenciosa do workflow sem custo adicional.
