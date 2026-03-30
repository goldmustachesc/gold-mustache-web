# Service Role Blast Radius — Análise de Risco

## Visão Geral

O `SUPABASE_SERVICE_ROLE_KEY` é uma chave privilegiada que **bypassa RLS** e tem acesso administrativo completo ao Supabase.

**Regra de ouro:** Esta chave NUNCA deve ser exposta no cliente. Uso restrito a operações server-side específicas.

---

## Inventário de Uso

### Módulo Principal

**Arquivo:** `src/lib/supabase/admin.ts`

| Função | Operações | Risco |
|--------|-----------|-------|
| `getSupabaseAdmin()` | Cria cliente com service_role | Alto — ponto de entrada |
| `findAuthUserByEmail(email)` | `admin.auth.admin.listUsers()` | Médio — lê todos os usuários |
| `getAuthUserEmailMap()` | `admin.auth.admin.listUsers()` | Médio — lê todos os usuários |

### Rotas Consumidoras

| Rota | Função usada | Operação | Proteção |
|------|--------------|----------|----------|
| `DELETE /api/profile/delete` | `getSupabaseAdmin()` | `admin.auth.admin.deleteUser()` | CSRF + Rate Limit + Auth |
| `GET /api/admin/loyalty/redemptions` | `getAuthUserEmailMap()` | Leitura de emails | requireAdmin() |
| `GET /api/admin/loyalty/accounts` | `getAuthUserEmailMap()` | Leitura de emails | requireAdmin() |
| `GET /api/admin/barbers` | `getAuthUserEmailMap()` | Leitura de emails | requireAdmin() |

---

## Análise de Risco por Operação

### 1. `admin.auth.admin.deleteUser(userId)`

| Aspecto | Avaliação |
|---------|-----------|
| **Impacto** | Alto — irreversível, remove acesso do usuário |
| **Escopo** | Limitado ao próprio usuário (validado via `supabase.auth.getUser()`) |
| **Proteções** | CSRF + Rate Limit + Autenticação obrigatória |
| **Logging** | ✓ Console com userId e timestamp |
| **Risco residual** | Baixo — operação auto-destrutiva, não escalona privilégios |

### 2. `admin.auth.admin.listUsers()`

| Aspecto | Avaliação |
|---------|-----------|
| **Impacto** | Médio — expõe emails de todos os usuários |
| **Escopo** | Amplo — acesso a toda a base de auth.users |
| **Proteções** | requireAdmin() — apenas ADMIN pode acessar |
| **Logging** | Não explícito |
| **Risco residual** | Médio — se ADMIN comprometido, emails vazam |

---

## Cenários de Comprometimento

### Cenário A: Chave vazada no cliente

**Impacto:** CRÍTICO
- Atacante pode deletar qualquer usuário
- Atacante pode listar todos os emails
- Atacante pode manipular auth.users diretamente

**Status:** MITIGADO
- Chave definida como `SUPABASE_SERVICE_ROLE_KEY` (sem prefixo `NEXT_PUBLIC_`)
- Verificado em `docs/release-evidence/env-audit.md`

### Cenário B: SSRF ou RCE no servidor

**Impacto:** ALTO
- Atacante com execução de código pode acessar variáveis de ambiente
- Pode usar service_role para operações maliciosas

**Mitigação:**
- [ ] Considerar segregar service_role em microserviço separado (overkill para o escopo atual)
- [x] Manter dependências atualizadas (audit de segurança no CI)

### Cenário C: Compromisso de conta ADMIN

**Impacto:** MÉDIO
- ADMIN já tem acesso legítimo às rotas
- Pode listar todos os emails (já é esperado)
- NÃO pode deletar outros usuários (apenas própria conta)

**Mitigação:**
- [x] ADMIN são contas verificadas manualmente
- [ ] Considerar MFA para contas ADMIN

---

## Recomendações

### Curto Prazo (Obrigatório)

1. **Confirmar que `SUPABASE_SERVICE_ROLE_KEY` NÃO tem prefixo `NEXT_PUBLIC_`**
   - [x] Documentado em `docs/environment-variables.md`
   - [ ] Verificar no Vercel Dashboard para staging
   - [ ] Verificar no Vercel Dashboard para production

2. **Adicionar logging nas operações de listUsers**
   - [ ] Log de acesso a `getAuthUserEmailMap()` com userId do chamador

3. **Validar fallback seguro quando service_role está ausente**
   - [x] Implementado em `getSupabaseAdmin()` → retorna null
   - [x] Rotas tratam null adequadamente

### Médio Prazo (Recomendado)

4. **Rotação periódica de chaves**
   - [ ] Definir processo de rotação (sugestão: trimestral)
   - [ ] Documentar procedimento

5. **Alertas de uso anômalo**
   - [ ] Configurar alerta se `deleteUser` for chamado mais de X vezes/hora
   - [ ] Configurar alerta se `listUsers` for chamado de IP desconhecido

### Longo Prazo (Nice-to-have)

6. **Segregação de service_role para microserviço**
   - Isolar operações admin em serviço separado com rate limit mais restrito
   - Overkill para escopo atual de barbearia

---

## Checklist de Auditoria

| Item | Staging | Production |
|------|---------|------------|
| `SUPABASE_SERVICE_ROLE_KEY` sem prefixo NEXT_PUBLIC_ | [ ] | [ ] |
| Chave NÃO aparece em logs ou resposta de API | [ ] | [ ] |
| Rotas admin protegidas por requireAdmin() | [x] | [x] |
| Rota de delete protegida por auth + CSRF + rate limit | [x] | [x] |
| Fallback seguro quando chave ausente | [x] | [x] |
| Logging de operações críticas | [x] | [x] |

---

## Responsável e Revisão

- **Última revisão:** ______________________
- **Próxima revisão:** ______________________
- **Responsável:** ______________________
