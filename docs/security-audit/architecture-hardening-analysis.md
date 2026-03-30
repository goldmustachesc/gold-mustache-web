# Análise de Hardening da Arquitetura

**Data:** 2026-03-28
**Ambiente:** Staging (aplicável também a Production)

---

## 1. Fronteira de Sessão (Proxy + Middleware)

### Arquivos Analisados

- `src/proxy.ts` — Next.js proxy (antigo middleware.ts)
- `src/lib/supabase/middleware.ts` — Lógica de sessão Supabase
- `src/lib/middleware/public-routes.ts` — Definição de rotas públicas

### Status: ✅ APROVADO

| Aspecto | Implementação | Status |
|---------|---------------|--------|
| **Chave utilizada** | `anon_key` via `createServerClient` | ✅ Correto |
| **Refresh de sessão** | `supabase.auth.getUser()` em toda requisição | ✅ Correto |
| **Fallback seguro** | Retorna `user: null` se env vars ausentes | ✅ Correto |
| **Rotas protegidas** | `/dashboard`, `/profile`, `/barbeiro`, `/admin` | ✅ Correto |
| **Redirect para login** | Com parâmetro `redirect` para retorno | ✅ Correto |
| **Rotas de auth** | Redireciona para dashboard se já logado | ✅ Correto |
| **Cookies** | Transferidos corretamente entre responses | ✅ Correto |
| **Rotas públicas de API** | Explicitamente definidas | ✅ Correto |

### Rotas Públicas de API

```
/api/barbers       — Lista de barbeiros (público)
/api/services      — Lista de serviços (público)
/api/slots         — Horários disponíveis (público)
/api/instagram/*   — Feed de Instagram (público)
/api/consent/*     — Gestão de consentimento (público)
/api/cron/*        — Jobs agendados (protegidos por CRON_SECRET)
```

**Nota:** Todas as outras rotas de API passam por `updateSession` e têm acesso à sessão do usuário.

---

## 2. Callback de Autenticação

### Arquivo: `src/app/[locale]/(auth)/auth/callback/route.ts`

### Status: ✅ APROVADO (com recomendações)

| Aspecto | Implementação | Status |
|---------|---------------|--------|
| **Code exchange** | `supabase.auth.exchangeCodeForSession(code)` | ✅ Correto |
| **Safe redirect** | `getSafeRedirectPath()` para evitar open redirect | ✅ Correto |
| **OAuth detection** | Considera `app_metadata.provider` e fallback seguro quando `providers` vier incompleto | ✅ Correto |
| **Email verification** | Atualiza `emailVerified` no Profile | ✅ Correto |
| **Error handling** | Redireciona para login com erro | ✅ Correto |
| **Forwarded host** | Só respeita `x-forwarded-host` quando bater com hosts confiáveis do ambiente | ✅ Correto |

### Recomendações

1. **Considerar rate limit:** O callback é invocado após redirect do Supabase, então o risco é baixo, mas um rate limit de "auth" poderia ser adicionado.

---

## 3. Fluxo de Notificações (Realtime)

### Arquivo: `src/hooks/useNotifications.ts`

### Status: ⚠️ PARCIAL (depende de RLS no Supabase)

| Aspecto | Implementação | Status |
|---------|---------------|--------|
| **Filtro cliente** | `filter: user_id=eq.${userId}` | ✅ Implementado |
| **Canal único por usuário** | `notifications:${userId}` | ✅ Correto |
| **API para leitura** | Vai via `/api/notifications` (server-side) | ✅ Correto |
| **RLS no servidor** | Requer configuração manual no Supabase | ⚠️ Pendente |

### Análise de Segurança

O filtro `filter: user_id=eq.${userId}` é aplicado no cliente, mas **não substitui RLS**.

**Cenário de ataque:**
1. Atacante modifica JavaScript para assinar sem filtro
2. Se não houver RLS, recebe todos os eventos de `notifications`

**Mitigação:**
- Executar `docs/security-audit/rls-policies-notifications.sql` no Supabase
- Executar `docs/security-audit/realtime-isolation-test.md` para validar

---

## 4. Uso de Service Role

### Arquivo: `src/lib/supabase/admin.ts`

### Status: ✅ APROVADO

Ver análise completa em `docs/security-audit/service-role-blast-radius.md`.

Resumo:
- Service role é usado apenas em 4 rotas server-side
- Todas protegidas por auth e/ou CSRF + rate limit
- Fallback seguro quando chave ausente
- Logging implementado para operações críticas

---

## 5. CSRF Protection

### Arquivo: `src/lib/api/verify-origin.ts`

### Status: ✅ APROVADO

| Aspecto | Implementação | Status |
|---------|---------------|--------|
| **Headers verificados** | `Origin`, `Referer` | ✅ Correto |
| **Origens permitidas** | `ALLOWED_ORIGINS`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL` | ✅ Correto |
| **Localhost** | Permitido em development | ✅ Correto |
| **Preflight** | OPTIONS retorna 204 | ✅ Correto |

**Nota:** `ALLOWED_ORIGINS` não está configurada em staging/production. Avaliar se necessário para domínios alternativos.

---

## 6. Rate Limiting

### Arquivo: `src/lib/rate-limit.ts`

### Status: ✅ APROVADO

| Tier | Limite | Janela | Usado em |
|------|--------|--------|----------|
| `default` | 60 | 60s | API geral |
| `sensitive` | 5 | 60s | Delete account, etc. |
| `auth` | 10 | 60s | Auth operations |

**Dependência:** Upstash Redis (configurado em ambos ambientes).

---

## 7. Resumo de Hardening

| Área | Status | Ação Necessária |
|------|--------|-----------------|
| Proxy/Middleware | ✅ Aprovado | Nenhuma |
| Auth Callback | ✅ Aprovado | Opcional: adicionar logging |
| Realtime Notifications | ⚠️ Parcial | **Configurar RLS + testar isolamento** |
| Service Role | ✅ Aprovado | Nenhuma |
| CSRF | ✅ Aprovado | Opcional: avaliar `ALLOWED_ORIGINS` |
| Rate Limiting | ✅ Aprovado | Nenhuma |

---

## 8. Próximos Passos

1. [x] Análise de código concluída
2. [ ] Configurar RLS na tabela `notifications` (script SQL fornecido)
3. [ ] Executar teste de isolamento do Realtime
4. [ ] Validar fluxos funcionais (OAuth, recovery, etc.)
5. [ ] Documentar evidências
