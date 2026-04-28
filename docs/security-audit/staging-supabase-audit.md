# Auditoria de Segurança Supabase — Staging

**Data:** 2026-03-28
**Ambiente:** Staging (Preview)
**Projeto Supabase:** `wkickkimvghrcnamvefx` (confirmar se é dedicado a staging ou compartilhado)
**URL de Staging:** `https://staging.goldmustachebarbearia.com.br`

---

## 1. Inventário de Variáveis de Ambiente (Vercel Preview)

| Variável | Presente | Escopo | Observação |
|----------|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | [x] Sim | Preview | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [x] Sim | Preview | Chave pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | [x] Sim | Preview | Possivelmente redundante com anon_key |
| `SUPABASE_SERVICE_ROLE_KEY` | [x] Sim | Preview | Server-only (crítico) |
| `DATABASE_URL` | [x] Sim | Preview | Conexão Prisma |
| `DIRECT_URL` | [x] Sim | Preview | Conexão direta Prisma |
| `NEXT_PUBLIC_ENVIRONMENT` | [x] Sim | Preview (staging) | Escopado para branch staging |
| `NEXT_PUBLIC_SITE_URL` | [x] Sim | Preview | URL canônica do ambiente |
| `ALLOWED_ORIGINS` | [ ] Não | - | Não configurada — avaliar necessidade |
| `CRON_SECRET` | [x] Sim | Preview | Secret para cron jobs |
| `UPSTASH_REDIS_REST_URL` | [x] Sim | Compartilhado | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | [x] Sim | Compartilhado | Rate limiting |

### Decisões pendentes

- [ ] Confirmar se `ALLOWED_ORIGINS` precisa ser configurada para staging
- [ ] Confirmar se `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` é redundante e pode ser removida
- [ ] Confirmar se staging e production usam projetos Supabase distintos

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
| Google OAuth | [ ] | [ ] | [ ] | Ver seção 3 |
| Outros providers | [ ] | [ ] | [ ] | Desativar se não usados |

### 2.3 Authentication — URL Configuration

| Item | Status | Valor esperado | Valor atual | Observação |
|------|--------|----------------|-------------|------------|
| Site URL | [ ] | `https://staging.goldmustachebarbearia.com.br` | | |
| Redirect URLs | [ ] | Incluir `https://staging.goldmustachebarbearia.com.br/pt-BR/auth/callback` | | |
| Recovery redirect | [ ] | `/pt-BR/reset-password/update` | | Verificar path correto |

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
| `notifications` | [ ] | [ ] | | **CRÍTICO** — usada pelo Realtime |
| `profiles` | [ ] | [ ] | | |
| `appointments` | [ ] | [ ] | | |
| `barbers` | [ ] | [ ] | | |
| `services` | [ ] | [ ] | | |
| Outras tabelas | [ ] | [ ] | | |

**Nota:** O projeto usa Prisma como camada principal de acesso. RLS é crítico apenas para recursos acessados diretamente pelo cliente (Realtime).

### 2.6 Realtime

| Item | Status | Observação |
|------|--------|------------|
| Realtime habilitado para `notifications` | [ ] | |
| Publicação intencional | [ ] | |
| Outras tabelas expostas ao Realtime | [ ] | Listar e avaliar |

### 2.7 Policies da tabela `notifications`

| Policy | Tipo | Condição | Status | Observação |
|--------|------|----------|--------|------------|
| SELECT | [ ] | `user_id = auth.uid()` | [ ] | **OBRIGATÓRIO** |
| INSERT | [ ] | | [ ] | Avaliar se necessário |
| UPDATE | [ ] | | [ ] | Avaliar se necessário |
| DELETE | [ ] | | [ ] | Avaliar se necessário |

**Teste de isolamento:**
- [ ] Criar dois usuários de teste
- [ ] User A assina canal de notificações
- [ ] Criar notificação para User B
- [ ] Confirmar que User A **não** recebe evento de User B

### 2.8 Storage

| Item | Status | Observação |
|------|--------|------------|
| Buckets existentes | [ ] | Listar |
| Buckets públicos | [ ] | Justificar cada um |
| Policies de storage.objects | [ ] | |

**Se não houver buckets:** marcar como `N/A — Storage não utilizado`

### 2.9 Edge Functions

| Item | Status | Observação |
|------|--------|------------|
| Functions existentes | [ ] | Listar |
| Secrets configurados | [ ] | |
| Validação de auth em functions | [ ] | |

**Se não houver functions:** marcar como `N/A — Edge Functions não utilizadas`

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
| Backups automáticos habilitados | [ ] | |
| Retenção adequada | [ ] | Período: ___ dias |
| Procedimento de restore conhecido | [ ] | |

---

## 3. Auditoria do Google Cloud Console (OAuth)

### 3.1 OAuth Consent Screen

| Item | Status | Observação |
|------|--------|------------|
| App publicado | [ ] | |
| Scopes corretos (email, profile, openid) | [ ] | |
| Nome do app correto | [ ] | |

### 3.2 OAuth Client ID

| Item | Status | Valor esperado | Valor atual | Observação |
|------|--------|----------------|-------------|------------|
| Client ID configurado | [ ] | | | |
| Authorized JavaScript origins | [ ] | `https://staging.goldmustachebarbearia.com.br` | | |
| Authorized redirect URIs | [ ] | `https://wkickkimvghrcnamvefx.supabase.co/auth/v1/callback` | | |

**Nota:** O doc atual (`docs/google-oauth-setup.md`) não inclui URLs de staging. Atualizar se necessário.

---

## 4. Checklist de Validação Funcional

| Fluxo | Status | Evidência | Observação |
|-------|--------|-----------|------------|
| Login email/senha | [ ] | | |
| Logout | [ ] | | |
| Google OAuth | [ ] | | Prioridade alta |
| Password recovery | [ ] | | Prioridade alta |
| Refresh de sessão | [ ] | | |
| Acesso ADMIN negado para CLIENT | [ ] | | |
| Acesso BARBER negado para CLIENT | [ ] | | |
| Exclusão de conta | [ ] | | |
| Isolamento Realtime (2 usuários) | [ ] | | Prioridade alta |

---

## 5. Resumo de Status

| Área | Status | Bloqueador |
|------|--------|------------|
| Variáveis Vercel | `Parcial` | `ALLOWED_ORIGINS` não configurada |
| Projeto Supabase | `Pendente auditoria` | |
| RLS/Policies | `Pendente auditoria` | `notifications` é crítico |
| OAuth Google | `Pendente auditoria` | URLs de staging não documentadas |
| Recovery | `Pendente auditoria` | |
| Realtime | `Pendente auditoria` | Isolamento não testado |
| Storage | `Pendente auditoria` | |
| Edge Functions | `Pendente auditoria` | |
| Backups | `Pendente auditoria` | |

---

## 6. Próximos Passos

1. [ ] Acessar Supabase Dashboard e preencher seções 2.1 a 2.11
2. [ ] Acessar Google Cloud Console e preencher seção 3
3. [ ] Executar validações funcionais da seção 4
4. [ ] Atualizar resumo de status
5. [ ] Decidir sobre `ALLOWED_ORIGINS` e projeto Supabase por ambiente
6. [ ] Criar issues/tasks para gaps identificados

---

## 7. Responsável e Aprovação

- **Auditor:** ______________________
- **Data da auditoria:** ______________________
- **Status final:** `[ ] Aprovado` / `[ ] Parcial` / `[ ] Reprovado`
- **Observações:** ______________________
