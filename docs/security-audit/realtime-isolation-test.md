# Teste de Isolamento do Realtime — Notifications

## Objetivo

Validar que notificações do `User A` **não vazam** para `User B` via Supabase Realtime.

## Pré-requisitos

1. RLS habilitado na tabela `notifications` com policy `SELECT ... USING (auth.uid() = user_id)`
2. Dois usuários de teste distintos com contas ativas
3. Acesso ao ambiente (staging ou production)

---

## Procedimento

### Preparação

1. **Criar/identificar dois usuários de teste:**
   - `User A`: email `test-a@example.com`
   - `User B`: email `test-b@example.com`

2. **Obter os UUIDs dos usuários:**
   - Via Supabase Dashboard > Authentication > Users
   - Ou via query: `SELECT id, email FROM auth.users WHERE email LIKE 'test-%';`

### Teste 1 — Isolamento via Aplicação

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 1.1 | Abrir navegador 1, fazer login como `User A` | Login bem-sucedido | [ ] |
| 1.2 | Abrir navegador 2 (incógnito), fazer login como `User B` | Login bem-sucedido | [ ] |
| 1.3 | No navegador 1 (`User A`), abrir DevTools > Network e filtrar por `realtime` | Conexão WebSocket ativa | [ ] |
| 1.4 | No navegador 2 (`User B`), abrir DevTools > Network e filtrar por `realtime` | Conexão WebSocket ativa | [ ] |
| 1.5 | Criar uma notificação para `User B` (via admin, API ou trigger) | Notificação criada no banco | [ ] |
| 1.6 | Verificar navegador 2 (`User B`) | Notificação aparece em tempo real | [ ] |
| 1.7 | Verificar navegador 1 (`User A`) | Notificação **NÃO** aparece | [ ] |
| 1.8 | Criar uma notificação para `User A` | Notificação criada no banco | [ ] |
| 1.9 | Verificar navegador 1 (`User A`) | Notificação aparece em tempo real | [ ] |
| 1.10 | Verificar navegador 2 (`User B`) | Notificação **NÃO** aparece | [ ] |

### Teste 2 — Bypass de Filtro Cliente (Adversarial)

Este teste simula um atacante tentando modificar o filtro do cliente.

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 2.1 | Login como `User A` | Login bem-sucedido | [ ] |
| 2.2 | Abrir Console do navegador | Console aberto | [ ] |
| 2.3 | Executar código para assinar notificações de `User B`: | | [ ] |

```javascript
// Código adversarial — tentar escutar notificações de outro usuário
const supabase = window.__supabase__ ||
  (await import('@supabase/supabase-js')).createClient(
    'SUA_URL',
    'SUA_ANON_KEY'
  );

// Tentar assinar sem filtro
const channel1 = supabase
  .channel('evil-all')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'notifications' },
    (payload) => console.log('ALL:', payload)
  )
  .subscribe();

// Tentar assinar com filtro de outro usuário
const channel2 = supabase
  .channel('evil-other')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.UUID_DO_USER_B' },
    (payload) => console.log('OTHER:', payload)
  )
  .subscribe();
```

| 2.4 | Criar notificação para `User B` | Notificação criada | [ ] |
| 2.5 | Verificar console de `User A` | **Nenhum evento** deve aparecer | [ ] |

**Se eventos aparecerem:** RLS não está funcionando corretamente. **BLOQUEADOR.**

### Teste 3 — Query Direta via API (Adversarial)

| Passo | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 3.1 | Login como `User A`, obter JWT | Token obtido | [ ] |
| 3.2 | Fazer request direto à API Supabase: | | [ ] |

```bash
curl -X GET 'https://PROJECT.supabase.co/rest/v1/notifications' \
  -H 'apikey: ANON_KEY' \
  -H 'Authorization: Bearer JWT_DO_USER_A' \
  -H 'Content-Type: application/json'
```

| 3.3 | Verificar resposta | **Apenas notificações de User A** | [ ] |
| 3.4 | Tentar query com filtro explícito de `User B`: | | [ ] |

```bash
curl -X GET 'https://PROJECT.supabase.co/rest/v1/notifications?user_id=eq.UUID_USER_B' \
  -H 'apikey: ANON_KEY' \
  -H 'Authorization: Bearer JWT_DO_USER_A' \
  -H 'Content-Type: application/json'
```

| 3.5 | Verificar resposta | **Array vazio** (RLS bloqueia) | [ ] |

---

## Resultados

| Teste | Status | Data | Executado por |
|-------|--------|------|---------------|
| Teste 1 (Aplicação) | [ ] Pass / [ ] Fail | | |
| Teste 2 (Bypass cliente) | [ ] Pass / [ ] Fail | | |
| Teste 3 (Query direta) | [ ] Pass / [ ] Fail | | |

---

## Critérios de Aprovação

- [x] RLS habilitado na tabela `notifications`
- [ ] Teste 1 passou (isolamento funcional)
- [ ] Teste 2 passou (bypass de filtro bloqueado)
- [ ] Teste 3 passou (query direta bloqueada)

**Status final:** [ ] APROVADO / [ ] REPROVADO

**Observações:**
_______________________________________________________________

---

## Troubleshooting

### Eventos vazando entre usuários

1. Verificar se RLS está habilitado: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'notifications';`
2. Verificar policies: `SELECT * FROM pg_policies WHERE tablename = 'notifications';`
3. Verificar se a coluna `user_id` contém o UUID correto de `auth.users`

### Realtime não funciona após habilitar RLS

1. Verificar se a tabela está publicada no Realtime: Dashboard > Database > Publications
2. Certificar que o usuário está autenticado antes de assinar

### Console mostra erros de permissão

Esperado se RLS estiver funcionando. Logs de erro controlado = comportamento correto.
