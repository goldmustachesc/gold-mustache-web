# Plano de Rollback

**Data de criação:** 2026-03-19
**Branch:** staging (candidato a release)
**Responsável pelo monitoramento pós-deploy:** ______________________

---

## Rollback de Deploy (Vercel)

### Passo a passo

1. Acessar o painel da Vercel: https://vercel.com/dashboard
2. Entrar no projeto `gold-mustache-web`
3. Ir em **Deployments**
4. Localizar o deployment anterior (o que estava em produção antes)
5. Clicar em **...** → **Promote to Production**

**Tempo estimado:** < 2 minutos (Vercel troca instantaneamente o alias de produção)

**Critério para acionar:** qualquer erro crítico detectado no smoke test pós-deploy ou alerta de usuário nos primeiros 30 minutos.

---

## Rollback de Migrations (Prisma / Banco)

### Situação: migration nova causou problema

As migrations do Prisma **não são automaticamente reversíveis**. O processo é:

1. Identificar a migration problemática em `prisma/migrations/`
2. Escrever SQL de reversão manualmente (ou usar `prisma migrate resolve --rolled-back <migration-name>`)
3. Executar o SQL de reversão diretamente no banco de produção via Supabase SQL Editor
4. Rodar `pnpm db:migrate:status` para confirmar estado consistente
5. Redeploy do commit anterior no Vercel

> ⚠️ Se houver dúvida sobre o SQL de reversão, **acionar o responsável técnico antes de executar qualquer comando no banco de produção**.

### Migrations incluídas neste release

> Gerado em 2026-03-19 via `git diff origin/main..staging -- prisma/migrations/`

- `00000000000000_baseline`
- `20251224160000_add_shop_hours_absences_and_roles`
- `20251226190000_allow_rebooking_cancelled_appointments`
- `20251227200000_add_guest_access_token`
- `20251227230000_fix_rebooking_unique_index_drift`
- `20251228120000_add_profile_address_fields`
- `20260105120000_add_cookie_consent_tracking`
- `20260107120000_add_appointment_client_check`
- `20260113180000_add_barbershop_settings`
- `20260222221919_add_loyalty_system`
- `20260228021853_add_missing_indexes`
- `20260308224500_add_review_item_indexes`
- `20260310190000_add_appointment_performance_indexes`
- `20260316200000_add_penalty_no_show_transaction_type`

⚠️ Confirmar antes do deploy que todas estão aplicadas no banco de produção: `pnpm db:migrate:status`

---

## Backups

- **Supabase:** backups automáticos habilitados? [ ] Sim / [ ] Verificar
- **Frequência dos backups:** diário (padrão Supabase Pro)
- **Ponto de restauração disponível antes do deploy:** ______________________

---

## Responsáveis

| Papel | Nome | Contato |
|-------|------|---------|
| Responsável técnico | | |
| Monitoramento imediato (primeiros 30min) | | |
| Escalação (se rollback não resolver) | | |

---

## Tempo máximo aceitável de downtime

**Definido pelo negócio:** ______________________ minutos

---

## Checklist pré-deploy (confirmar antes de ir)

- [ ] Backup do banco confirmado ou snapshot manual criado
- [ ] Deployment anterior identificado no Vercel (para promoção rápida)
- [ ] Responsável de monitoramento disponível e ciente
- [ ] SQL de reversão preparado para migrations novas (se houver)
- [ ] Todos os itens do checklist `docs/checklist-prontidao-producao.md` aprovados
