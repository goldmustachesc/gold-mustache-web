# 002 - Implementar endpoints de resgate (cliente + admin)

## Fase: 3 — Resgate de Recompensas (Backend)

## Prioridade: 🔴 ALTA (Feature Core)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

O frontend já possui UI para resgatar recompensas e o hook `useRedeemReward` chama `POST /api/loyalty/redemptions`, mas **a rota não existe**. A chamada retorna 404. Além disso, não existe endpoint para listar resgates do cliente, nem para o admin marcar um código como usado na barbearia.

## O que implementar

### Endpoints Cliente

#### 1. `POST /api/loyalty/redemptions`

Resgatar uma recompensa. Usa `RewardsService.redeemReward()` da task 001.

**Request body:**
```json
{ "rewardId": "uuid-here" }
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "code": "A3X9K2",
    "pointsSpent": 500,
    "expiresAt": "2026-04-01T...",
    "reward": { "name": "Barba grátis", "type": "FREE_SERVICE" }
  }
}
```

**Erros:** 400 (saldo insuficiente, reward inativo, sem estoque), 401 (não autenticado), 404 (reward não existe)

#### 2. `GET /api/loyalty/redemptions`

Listar resgates do usuário autenticado (paginado).

**Query params:** `page`, `limit`

**Response:** `apiCollection` com array de `Redemption` incluindo `reward { name, type }` e status derivado (PENDING / USED / EXPIRED).

### Endpoint Admin

#### 3. `POST /api/admin/loyalty/redemptions/use`

Admin marca um código de resgate como utilizado quando o cliente apresenta na barbearia.

**Request body:**
```json
{ "code": "A3X9K2" }
```

**Response (200):** Redemption atualizada com `usedAt`.

**Erros:** 400 (já usado, expirado), 404 (código não encontrado)

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/loyalty/redemptions/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes POST + GET |
| `src/app/api/admin/loyalty/redemptions/__tests__/use.route.test.ts` | **Criar PRIMEIRO** — testes POST use |
| `src/app/api/loyalty/redemptions/route.ts` | **Criar** — POST (resgatar) + GET (listar) |
| `src/app/api/admin/loyalty/redemptions/use/route.ts` | **Criar** — POST (marcar como usado) |
| `src/lib/validations/loyalty.ts` | Adicionar schemas se não criados na task 001 |

## Padrões a seguir

- Usar `requireAuth()` nos endpoints cliente
- Usar `requireAdmin()` no endpoint admin
- Usar `apiSuccess` / `apiCollection` / `apiError` para responses padronizadas
- Validar body com Zod schema
- Seguir padrão de paginação existente (`page`, `limit`, `apiCollection`)

## Dependência

- Task 001 (rewards.service.ts) deve estar implementada

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Arquivo: `src/app/api/loyalty/redemptions/__tests__/route.test.ts`

**Testes `POST /api/loyalty/redemptions`:**
- [x] Deve retornar 401 quando não autenticado
- [x] Deve retornar 400 quando body inválido (sem rewardId, rewardId não-UUID)
- [x] Deve retornar 201 com redemption data quando resgate bem-sucedido
- [x] Deve retornar 400 quando saldo insuficiente (erro do service)
- [x] Deve retornar 404 quando reward não existe (erro do service)
- [x] Deve chamar `RewardsService.redeemReward` com accountId e rewardId corretos

**Testes `GET /api/loyalty/redemptions`:**
- [x] Deve retornar 401 quando não autenticado
- [x] Deve retornar 200 com lista paginada de redemptions
- [x] Deve incluir `reward { name, type }` em cada item
- [x] Deve derivar status correto: PENDING / USED / EXPIRED
- [x] Deve respeitar paginação (`page`, `limit`)
- [x] Deve retornar lista vazia quando sem resgates

#### Arquivo: `src/app/api/admin/loyalty/redemptions/__tests__/use.route.test.ts`

**Testes `POST /api/admin/loyalty/redemptions/use`:**
- [x] Deve retornar 401/403 quando não admin
- [x] Deve retornar 400 quando body inválido (sem code)
- [x] Deve retornar 200 com redemption atualizada (usedAt preenchido)
- [x] Deve retornar 400 quando código já usado
- [x] Deve retornar 400 quando código expirado
- [x] Deve retornar 404 quando código não encontrado

- [x] Rodar `pnpm test` → confirmar que TODOS os testes falham (RED)

### Mocks necessários

```typescript
// Auth
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Admin
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Service
vi.mock("@/services/loyalty/rewards.service", () => ({
  RewardsService: {
    redeemReward: vi.fn(),
    validateRedemptionCode: vi.fn(),
    markRedemptionAsUsed: vi.fn(),
  },
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [x] Criar `src/app/api/loyalty/redemptions/route.ts` com POST handler
- [x] Rodar testes POST → GREEN
- [x] Adicionar GET handler no mesmo arquivo
- [x] Rodar testes GET → GREEN
- [x] Criar `src/app/api/admin/loyalty/redemptions/use/route.ts` com POST handler
- [x] Rodar testes admin → GREEN
- [x] Verificar que hook `useRedeemReward` em `useLoyalty.ts` aponta para o endpoint correto
- [x] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [x] Extrair lógica de derivação de status (PENDING/USED/EXPIRED) para utility function
- [x] Verificar response format consistente com outros endpoints existentes
- [x] Rodar `pnpm test` → continua GREEN
- [x] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDA
