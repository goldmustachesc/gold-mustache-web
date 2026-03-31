# Auditoria de Segurança Supabase — Production

**Data:** ______________________
**Ambiente:** Production
**Projeto Supabase:** `wkickkimvghrcnamvefx` (confirmar se é o mesmo de staging ou dedicado)
**URL de Production:** `https://www.goldmustachebarbearia.com.br`

---

## 1. Inventário de Variáveis de Ambiente (Vercel Production)

| Variável | Presente | Escopo | Observação |
|----------|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [x] Sim | Production | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [x] Sim | Production | Chave pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | [x] Sim | Production | Possivelmente redundante |
| `SUPABASE_SERVICE_ROLE_KEY` | [x] Sim | Production | Server-only (crítico) |
| `DATABASE_URL` | [x] Sim | Production | Conexão Prisma |
| `DIRECT_URL` | [x] Sim | Production | Conexão direta Prisma |
| `NEXT_PUBLIC_ENVIRONMENT` | [x] Sim | Production | `production` |
| `NEXT_PUBLIC_SITE_URL` | [x] Sim | Production | `https://www.goldmustachebarbearia.com.br` |
| `ALLOWED_ORIGINS` | [ ] Não | - | Não configurada |
| `CRON_SECRET` | [x] Sim | Production | **Diferente de staging** |
| `UPSTASH_REDIS_REST_URL` | [x] Sim | Compartilhado | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | [x] Sim | Compartilhado | Rate limiting |
| `NEXT_PUBLIC_GTM_ID` | [x] Sim | Production | Google Tag Manager |
| `NEXT_PUBLIC_GA_ID` | [x] Sim | Production | Google Analytics |

### Pré-requisitos de staging

- [ ] Staging passou no gate de promoção
- [ ] Todas as configurações críticas validadas em staging primeiro
- [ ] Evidências de staging documentadas

---

## 2. Auditoria do Supabase Dashboard

### 2.1 Projeto e Chaves

| Item | Status | Evidência | Observação |
|------|--------|-----------|------------|
| Projeto correto identificado | [ ] | | |
| `anon` key ativa | [ ] | | |
| `service_role` key ativa | [ ] | | |
| Outras chaves inativas/desnecessárias | [ ] | | |
| Data de criação das chaves | [ ] | | |
| Rotação de chaves planejada | [ ] | | |

### 2.2 Authentication — Providers

| Provider | Status | Configurado | Testado | Observação |
|----------|--------|-------------|---------|------------|
| Email/Password | [ ] | [ ] | [ ] | |
| Google OAuth | [ ] | [ ] | [ ] | |
| Outros providers | [ ] | [ ] | [ ] | |

### 2.3 Authentication — URL Configuration

| Item | Status | Valor esperado | Valor atual | Observação |
|------|--------|----------------|-------------|------------|
| Site URL | [ ] | `https://www.goldmustachebarbearia.com.br` | | |
| Redirect URLs | [ ] | Incluir `https://www.goldmustachebarbearia.com.br/auth/callback` | | |
| Recovery redirect | [ ] | `/reset-password/update` | | |

### 2.4 Authentication — Email Templates

| Template | Status | Redirect correto | Observação |
|----------|--------|------------------|------------|
| Confirm signup | [ ] | | |
| Reset password | [ ] | | |
| Magic link | [ ] | | |
| Change email | [ ] | | |

### 2.5 Database — RLS e Policies

| Tabela | RLS Enabled | Policies | Status | Observação |
|--------|-------------|----------|--------|------------|
| `notifications` | [ ] | [ ] | | **CRÍTICO** |
| `profiles` | [ ] | [ ] | | |
| `appointments` | [ ] | [ ] | | |
| `barbers` | [ ] | [ ] | | |
| `services` | [ ] | [ ] | | |
| Outras tabelas | [ ] | [ ] | | |

### 2.6 Realtime

| Item | Status | Observação |
|------|--------|------------|
| Realtime habilitado para `notifications` | [ ] | |
| Publicação intencional | [ ] | |
| Outras tabelas expostas ao Realtime | [ ] | |

### 2.7 Policies da tabela `notifications`

| Policy | Tipo | Condição | Status | Observação |
|--------|------|----------|--------|------------|
| SELECT | [ ] | `user_id = auth.uid()` | [ ] | **OBRIGATÓRIO** |
| INSERT | [ ] | | [ ] | |
| UPDATE | [ ] | | [ ] | |
| DELETE | [ ] | | [ ] | |

### 2.8 Storage

| Item | Status | Observação |
|------|--------|------------|
| Buckets existentes | [ ] | |
| Buckets públicos | [ ] | |
| Policies de storage.objects | [ ] | |

### 2.9 Edge Functions

| Item | Status | Observação |
|------|--------|------------|
| Functions existentes | [ ] | |
| Secrets configurados | [ ] | |
| Validação de auth em functions | [ ] | |

### 2.10 Logs e Monitoramento

| Item | Status | Período auditado | Observação |
|------|--------|------------------|------------|
| Auth logs sem erros críticos | [ ] | | |
| Database logs sem acessos negados suspeitos | [ ] | | |
| Realtime logs sem falhas | [ ] | | |
| Padrões de abuso identificados | [ ] | | |

### 2.11 Backups

| Item | Status | Observação |
|------|--------|------------|
| Backups automáticos habilitados | [ ] | **CRÍTICO para production** |
| Retenção adequada | [ ] | Mínimo recomendado: 7 dias |
| Procedimento de restore conhecido | [ ] | |
| Último backup verificado | [ ] | |

---

## 3. Auditoria do Google Cloud Console (OAuth)

### 3.1 OAuth Consent Screen

| Item | Status | Observação |
|------|--------|------------|
| App publicado | [ ] | |
| Scopes corretos | [ ] | |
| Nome do app correto | [ ] | |

### 3.2 OAuth Client ID

| Item | Status | Valor esperado | Valor atual | Observação |
|------|--------|----------------|-------------|------------|
| Client ID configurado | [ ] | | | |
| Authorized JavaScript origins | [ ] | `https://www.goldmustachebarbearia.com.br` | | |
| Authorized redirect URIs | [ ] | `https://wkickkimvghrcnamvefx.supabase.co/auth/v1/callback` | | |

---

## 4. Smoke Test Pós-Deploy

Usar checklist de `docs/release-evidence/post-deploy-smoke.md` e registrar resultados aqui.

| Item | Status | Observação |
|------|--------|------------|
| Home carrega | [ ] | |
| HTTPS responde | [ ] | |
| Banner staging NÃO aparece | [ ] | |
| robots.txt permite indexação | [ ] | |
| Login funciona | [ ] | |
| Logout funciona | [ ] | |
| Agendamento abre | [ ] | |
| Admin acessível | [ ] | |

---

## 5. Monitoramento Pós-Deploy

| Item | Período | Status | Observação |
|------|---------|--------|------------|
| Erros 401/403 inesperados | Primeiras 24h | [ ] | |
| Falhas de auth | Primeiras 24h | [ ] | |
| Falhas de Realtime | Primeiras 24h | [ ] | |
| Rate limit triggers | Primeiras 24h | [ ] | |

---

## 6. Resumo de Status

| Área | Status | Bloqueador |
|------|--------|------------|
| Pré-requisitos staging | `Pendente` | |
| Variáveis Vercel | `Parcial` | |
| Projeto Supabase | `Pendente` | |
| RLS/Policies | `Pendente` | |
| OAuth Google | `Pendente` | |
| Recovery | `Pendente` | |
| Realtime | `Pendente` | |
| Backups | `Pendente` | **CRÍTICO** |
| Smoke pós-deploy | `Pendente` | |
| Monitoramento | `Pendente` | |

---

## 7. Responsável e Aprovação

- **Auditor:** ______________________
- **Data da auditoria:** ______________________
- **Staging aprovado em:** ______________________
- **Status final:** `[ ] Aprovado` / `[ ] Parcial` / `[ ] Reprovado`
- **Observações:** ______________________
