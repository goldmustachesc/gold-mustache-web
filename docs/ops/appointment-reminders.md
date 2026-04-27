# Appointment Reminders — Ops Guide

## Overview

`/api/cron/appointment-reminders` is still the business endpoint that sends reminders.
The scheduler is no longer Vercel Cron on Hobby because the `*/15 * * * *` schedule blocks deployment.

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

Example values:

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

The endpoint should return:
- `401` without `Authorization`
- `200` with the shared secret

## Operational Notes

- The GitHub Actions job fails if the endpoint does not return `2xx`.
- Keep staging manual so the production scheduler is the only recurring automation.
- If the scheduler needs to be changed later, update only `.github/workflows/appointment-reminders.yml` and the `APPOINTMENT_REMINDERS_URL` secret.
