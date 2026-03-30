# Checklist de Rollout — Production

**Data:** ______________________
**Branch de origem:** `staging` (validado)
**Ambiente destino:** Production
**URL:** `https://www.goldmustachebarbearia.com.br`

---

## Pré-requisitos

| Item | Status | Responsável |
|------|--------|-------------|
| Gate de staging aprovado | [ ] | |
| Todas as evidências documentadas | [ ] | |
| Branch staging estável (sem commits pendentes) | [ ] | |
| Backup de production existente | [ ] | |
| Rollback plan revisado | [ ] | |

---

## 1. Configuração Supabase Production

### 1.1 Projeto e Chaves

| Item | Status | Observação |
|------|--------|------------|
| Projeto correto identificado | [ ] | |
| Chaves ativas (anon, service_role) | [ ] | |

### 1.2 Authentication

| Item | Staging | Production | Status |
|------|---------|------------|--------|
| Site URL | `staging.goldmustachebarbearia.com.br` | `www.goldmustachebarbearia.com.br` | [ ] |
| Redirect URLs | Configurado | [ ] Verificar | [ ] |
| Google OAuth | Funcionando | [ ] Verificar | [ ] |
| Email templates | Configurado | [ ] Verificar | [ ] |

### 1.3 RLS e Policies

| Tabela | RLS | Policies | Status |
|--------|-----|----------|--------|
| `notifications` | [ ] | [ ] | [ ] |
| Outras | [ ] | [ ] | [ ] |

**Script:** Usar `rls-policies-notifications.sql` se necessário

---

## 2. Configuração Vercel Production

### 2.1 Variáveis de Ambiente

| Variável | Valor Esperado | Verificado |
|----------|----------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto production | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key production | [ ] |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role production | [ ] |
| `NEXT_PUBLIC_ENVIRONMENT` | `production` | [ ] |
| `NEXT_PUBLIC_SITE_URL` | `https://www.goldmustachebarbearia.com.br` | [ ] |
| `CRON_SECRET` | Diferente de staging | [ ] |
| `DATABASE_URL` | Connection string production | [ ] |

### 2.2 Domínio

| Item | Status |
|------|--------|
| Domínio principal configurado | [ ] |
| SSL válido | [ ] |
| Redirect www → non-www (ou vice-versa) | [ ] |

---

## 3. Deploy

### 3.1 Pré-deploy

```bash
# Verificar branch
git checkout staging
git pull origin staging

# Verificar build local
pnpm build

# Verificar testes
pnpm test
```

| Item | Status |
|------|--------|
| Build local OK | [ ] |
| Testes locais OK | [ ] |

### 3.2 Deploy

| Método | Comando | Status |
|--------|---------|--------|
| Via Vercel CLI | `vercel --prod` | [ ] |
| Via Git push | Push para branch production | [ ] |
| Via Dashboard | Manual deploy | [ ] |

**Método escolhido:** ______________________
**Timestamp do deploy:** ______________________
**Deploy URL:** ______________________

---

## 4. Smoke Test Pós-Deploy

Referência: `docs/release-evidence/post-deploy-smoke.md`

### 4.1 Verificações Básicas

| Item | Status | Observação |
|------|--------|------------|
| Home carrega | [ ] | |
| HTTPS funciona | [ ] | |
| Redirect correto | [ ] | |
| Banner de staging NÃO aparece | [ ] | |

### 4.2 Auth

| Item | Status | Observação |
|------|--------|------------|
| Login email/senha | [ ] | |
| Logout | [ ] | |
| Google OAuth | [ ] | |
| Password recovery | [ ] | |

### 4.3 Funcionalidades Críticas

| Item | Status | Observação |
|------|--------|------------|
| Agendamento (início do flow) | [ ] | |
| Dashboard cliente | [ ] | |
| Dashboard barbeiro | [ ] | |
| Admin | [ ] | |
| Notificações (aparecem) | [ ] | |

### 4.4 SEO e Headers

| Item | Status | Observação |
|------|--------|------------|
| robots.txt permite indexação | [ ] | |
| sitemap.xml acessível | [ ] | |
| Headers de segurança presentes | [ ] | |

```bash
# Comando de verificação
curl -I 'https://www.goldmustachebarbearia.com.br/' | grep -E 'Strict-Transport|X-Content-Type|X-Frame'

curl 'https://www.goldmustachebarbearia.com.br/robots.txt'
```

---

## 5. Monitoramento Pós-Deploy

### 5.1 Primeiras 2 Horas

| Item | Status | Observação |
|------|--------|------------|
| Vercel Analytics OK | [ ] | |
| Nenhum erro 5xx nos logs | [ ] | |
| Nenhum erro 401/403 inesperado | [ ] | |
| Rate limit não triggered erroneamente | [ ] | |

### 5.2 Primeiras 24 Horas

| Item | Status | Observação |
|------|--------|------------|
| Cron jobs executando | [ ] | |
| Notificações funcionando | [ ] | |
| Nenhum report de usuário | [ ] | |
| Performance dentro do esperado | [ ] | |

---

## 6. Rollback Plan

### 6.1 Critérios de Rollback

| Critério | Ação |
|----------|------|
| Erro 5xx em mais de 5% das requests | Rollback imediato |
| Auth completamente quebrado | Rollback imediato |
| Perda de dados | Rollback + investigação |
| Performance degradada > 50% | Investigar, rollback se não resolver |

### 6.2 Procedimento de Rollback

```bash
# Via Vercel CLI
vercel rollback

# Ou via Dashboard
# Vercel Dashboard > Deployments > Redeploy último deploy estável
```

**Deploy estável anterior:** ______________________

---

## 7. Conclusão

| Item | Status |
|------|--------|
| Deploy bem-sucedido | [ ] |
| Smoke tests passaram | [ ] |
| Monitoramento inicial OK | [ ] |
| Rollback não necessário | [ ] |

### Assinaturas

| Papel | Nome | Data |
|-------|------|------|
| Responsável pelo deploy | | |
| Revisor | | |

**Status Final:** `[ ] SUCESSO` / `[ ] PARCIAL` / `[ ] ROLLBACK EXECUTADO`

**Observações:**
_______________________________________________________________
