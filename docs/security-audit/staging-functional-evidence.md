# Evidências Funcionais e de Segurança — Staging

**Data:** 2026-03-28
**Ambiente:** Staging
**URL:** `https://staging.goldmustachebarbearia.com.br`

---

## 1. Autenticação e Sessão

### 1.1 Login com Email/Senha

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Acessar `/pt-BR/login` | Página de login carrega | [ ] | |
| Inserir credenciais válidas | Login bem-sucedido | [ ] | |
| Verificar redirect para dashboard | Dashboard carrega | [ ] | |
| Verificar cookie de sessão | Cookie `sb-*` presente | [ ] | |

**Observações:** ______________________

### 1.2 Logout

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Clicar em logout | Sessão encerrada | [ ] | |
| Tentar acessar `/dashboard` | Redirect para login | [ ] | |
| Verificar cookies | Cookies de sessão removidos | [ ] | |

**Observações:** ______________________

### 1.3 Refresh de Sessão

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login no sistema | Sessão ativa | [ ] | |
| Aguardar 5 minutos | Sessão ainda ativa | [ ] | |
| Fazer request para API | Request bem-sucedido | [ ] | |
| Verificar cookie atualizado | Cookie com novo timestamp | [ ] | |

**Observações:** ______________________

---

## 2. OAuth (Google)

### 2.1 Login com Google

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Acessar `/pt-BR/login` | Página carrega | [ ] | |
| Clicar "Continuar com Google" | Redirect para Google | [ ] | |
| Autorizar no Google | Retorno para callback | [ ] | |
| Verificar redirect final | Dashboard carrega | [ ] | |
| Verificar profile criado | Profile existe no banco | [ ] | |
| Verificar emailVerified | Flag `true` no profile | [ ] | |

**Observações:** ______________________

### 2.2 Login com Google (Conta Existente)

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login com Google (já cadastrado) | Login bem-sucedido | [ ] | |
| Verificar dados preservados | Profile não sobrescrito | [ ] | |

**Observações:** ______________________

---

## 3. Password Recovery

### 3.1 Solicitar Recuperação

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Acessar `/pt-BR/reset-password` | Página carrega | [ ] | |
| Inserir email válido | Mensagem de sucesso | [ ] | |
| Verificar email recebido | Email com link | [ ] | |
| Verificar URL do link | Aponta para staging | [ ] | |

**Observações:** ______________________

### 3.2 Redefinir Senha

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Clicar no link do email | Página de redefinição | [ ] | |
| Inserir nova senha | Senha alterada | [ ] | |
| Login com nova senha | Login bem-sucedido | [ ] | |
| Login com senha antiga | Login falha | [ ] | |

**Observações:** ______________________

---

## 4. Autorização (RBAC)

### 4.1 Acesso ADMIN

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login como ADMIN | Login bem-sucedido | [ ] | |
| Acessar `/admin` | Dashboard admin carrega | [ ] | |
| Acessar `/barbeiro` | Acesso permitido | [ ] | |
| Acessar `/dashboard` | Acesso permitido | [ ] | |

**Observações:** ______________________

### 4.2 Acesso BARBER

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login como BARBER | Login bem-sucedido | [ ] | |
| Acessar `/barbeiro` | Dashboard barbeiro carrega | [ ] | |
| Acessar `/admin` | Acesso negado (403 ou redirect) | [ ] | |
| Acessar `/dashboard` | Acesso permitido | [ ] | |

**Observações:** ______________________

### 4.3 Acesso CLIENT

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login como CLIENT | Login bem-sucedido | [ ] | |
| Acessar `/dashboard` | Dashboard cliente carrega | [ ] | |
| Acessar `/barbeiro` | Acesso negado | [ ] | |
| Acessar `/admin` | Acesso negado | [ ] | |

**Observações:** ______________________

---

## 5. Exclusão de Conta

### 5.1 Delete Account

| Passo | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Login como usuário de teste | Login bem-sucedido | [ ] | |
| Acessar `/profile` | Profile carrega | [ ] | |
| Solicitar exclusão | Modal de confirmação | [ ] | |
| Confirmar exclusão | Conta deletada | [ ] | |
| Tentar login novamente | Login falha | [ ] | |
| Verificar profile no banco | Profile removido | [ ] | |
| Verificar appointments | `client_id = NULL` preservado | [ ] | |

**Observações:** ______________________

---

## 6. Isolamento do Realtime

### 6.1 Teste de Isolamento

Referência: `docs/security-audit/realtime-isolation-test.md`

| Teste | Status | Evidência |
|-------|--------|-----------|
| Teste 1 — Isolamento via Aplicação | [ ] Pass / [ ] Fail | |
| Teste 2 — Bypass de Filtro Cliente | [ ] Pass / [ ] Fail | |
| Teste 3 — Query Direta via API | [ ] Pass / [ ] Fail | |

**User A UUID:** ______________________
**User B UUID:** ______________________
**Observações:** ______________________

---

## 7. CSRF e Origin Protection

### 7.1 Verificação de Origin

| Teste | Resultado Esperado | Status | Evidência |
|-------|-------------------|--------|-----------|
| Request de staging origin | Sucesso (200) | [ ] | |
| Request sem Origin header | Bloqueado (403) | [ ] | |
| Request de origin malicioso | Bloqueado (403) | [ ] | |

**Comando de teste:**
```bash
# Request válido
curl -X POST 'https://staging.goldmustachebarbearia.com.br/api/notifications/mark-all-read' \
  -H 'Origin: https://staging.goldmustachebarbearia.com.br' \
  -H 'Cookie: sb-xxx=...' \
  -v

# Request inválido (deve falhar)
curl -X POST 'https://staging.goldmustachebarbearia.com.br/api/notifications/mark-all-read' \
  -H 'Origin: https://evil.com' \
  -H 'Cookie: sb-xxx=...' \
  -v
```

**Observações:** ______________________

---

## 8. Rate Limiting

### 8.1 Teste de Rate Limit

| Endpoint | Limite | Teste | Status | Evidência |
|----------|--------|-------|--------|-----------|
| `/api/profile/delete` | 5/min | Enviar 6 requests | [ ] | |
| `/api/notifications` | 60/min | Enviar 61 requests | [ ] | |

**Observações:** ______________________

---

## 9. Cron Jobs

### 9.1 Cron Autenticado

| Job | Endpoint | Autenticação | Status | Evidência |
|-----|----------|--------------|--------|-----------|
| sync-instagram | `/api/cron/sync-instagram` | `CRON_SECRET` | [ ] | |
| cleanup-guests | `/api/cron/cleanup-guests` | `CRON_SECRET` | [ ] | |

**Comando de teste:**
```bash
# Request sem secret (deve falhar)
curl 'https://staging.goldmustachebarbearia.com.br/api/cron/sync-instagram' -v

# Request com secret válido (deve funcionar)
curl 'https://staging.goldmustachebarbearia.com.br/api/cron/sync-instagram' \
  -H 'Authorization: Bearer CRON_SECRET_VALUE' -v
```

**Observações:** ______________________

---

## 10. Headers de Segurança

### 10.1 Verificação de Headers

| Header | Valor Esperado | Status | Evidência |
|--------|----------------|--------|-----------|
| `Strict-Transport-Security` | `max-age=...` | [ ] | |
| `X-Content-Type-Options` | `nosniff` | [ ] | |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` | [ ] | |
| `Referrer-Policy` | Configurado | [ ] | |
| `Content-Security-Policy` | Configurado | [ ] | |

**Comando de teste:**
```bash
curl -I 'https://staging.goldmustachebarbearia.com.br/' | grep -E 'Strict-Transport|X-Content-Type|X-Frame|Referrer-Policy|Content-Security'
```

**Observações:** ______________________

---

## 11. Testes Automatizados

**Executado em:** 2026-03-28 23:31:04
**Resultado:** ✅ 2487 testes passaram, 330 arquivos
**Duração:** 50.72s

### Cobertura de Testes Relevantes

| Área | Arquivo(s) | Status |
|------|------------|--------|
| Auth Service | `src/services/__tests__/auth.service.test.ts` | ✅ 18 testes |
| Notifications | `src/app/api/notifications/__tests__/route.test.ts` | ✅ 4 testes |
| Notifications Actions | `src/actions/__tests__/notifications.test.ts` | ✅ 5 testes |
| Profile Delete | `src/app/api/profile/__tests__/delete.route.test.ts` | ✅ Passando |
| Redirect Utils | `src/utils/__tests__/redirect.test.ts` | ✅ 14 testes |
| Auth Errors | `src/utils/__tests__/auth-errors.test.ts` | ✅ 23 testes |

---

## 12. Resumo de Resultados Manuais

| Área | Total Testes | Aprovados | Reprovados | Pendentes |
|------|--------------|-----------|------------|-----------|
| Auth Email/Senha | 12 | | | 12 |
| OAuth Google | 8 | | | 8 |
| Password Recovery | 8 | | | 8 |
| RBAC | 12 | | | 12 |
| Delete Account | 7 | | | 7 |
| Realtime Isolation | 3 | | | 3 |
| CSRF | 3 | | | 3 |
| Rate Limiting | 2 | | | 2 |
| Cron Jobs | 2 | | | 2 |
| Security Headers | 5 | | | 5 |
| **TOTAL MANUAL** | **62** | **0** | **0** | **62** |

---

## 12. Bloqueadores Identificados

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| | | | |

---

## 13. Assinaturas

- **Executado por:** ______________________
- **Data de execução:** ______________________
- **Status final:** `[ ] Aprovado` / `[ ] Parcial` / `[ ] Reprovado`
- **Próximo passo:** `[ ] Pode promover para production` / `[ ] Requer correções`
