# 009 - Padronizar formato de resposta das APIs

## Status: ✅ CONCLUÍDA

## Prioridade: 🟠 ALTA (Arquitetura / DX)

## Problema

As rotas da API retornam respostas em formatos diferentes, o que dificulta o tratamento no front-end. O front-end precisa lidar com múltiplas estruturas, aumentando a chance de bugs.

## Formatos encontrados

### Sucesso — pelo menos 4 padrões diferentes:

```typescript
// Padrão 1: apenas o dado
{ settings: {...} }
{ barber: {...} }
{ appointments: [...] }

// Padrão 2: com wrapper "success"
{ success: true, rewards: [...] }
{ success: true, message: "...", data: {...} }

// Padrão 3: com wrapper "data" e "meta"
{ success: true, data: [...], meta: { total, page } }

// Padrão 4: booleano genérico
{ ok: true }
```

### Erro — pelo menos 3 padrões diferentes:

```typescript
// Padrão 1: error code + message (mais comum)
{ error: "UNAUTHORIZED", message: "Não autorizado" }

// Padrão 2: apenas error string
{ error: "Unauthorized" }
{ error: "Profile not found" }

// Padrão 3: success false
{ success: false, error: "Erro interno do servidor" }
```

## Exemplos específicos

| Arquivo | Formato de sucesso | Formato de erro |
|---------|-------------------|----------------|
| `api/admin/settings` | `{ settings }` | `{ error, message }` |
| `api/loyalty/transactions` | `{ success, data, meta }` | `{ error: "Unauthorized" }` |
| `api/admin/shop-closures/[id]` DELETE | `{ ok: true }` | `{ error, message }` |
| `api/admin/loyalty/rewards` | `{ success, rewards }` | `{ success: false, error }` |
| `api/admin/loyalty/rewards` POST | `{ success, message, data }` | `{ error, details }` |

## Proposta de padronização

### Sucesso:
```typescript
// Para coleções
{ data: [...], meta?: { total, page, limit } }

// Para item único
{ data: {...} }

// Para operações sem retorno
{ success: true, message?: "..." }
```

### Erro:
```typescript
{ error: "ERROR_CODE", message: "Mensagem amigável", details?: {...} }
```

## Recomendação

Criar helpers tipados para respostas:

```typescript
// src/lib/api/response.ts
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: code, message, ...(details && { details }) }, { status });
}
```

## Solução implementada

### 1. Helpers tipados (`src/lib/api/response.ts`)

Quatro helpers criados:
- `apiSuccess<T>(data, status?)` → `{ data: T }`
- `apiCollection<T>(data[], meta?, status?)` → `{ data: T[], meta? }`
- `apiMessage(message?, status?)` → `{ success: true, message? }`
- `apiError(code, message, status, details?)` → `{ error, message, details? }`

### 2. Tipos compartilhados (`src/types/api.ts`)

Interfaces TypeScript para todas as formas de resposta:
- `ApiSuccessResponse<T>`, `ApiCollectionResponse<T>`, `ApiMessageResponse`, `ApiErrorResponse`, `PaginationMeta`

### 3. Helper frontend (`src/lib/api/client.ts`)

- Classe `ApiError` com `code`, `status`, `details`
- Funções `apiRequest<T>()`, `apiGet<T>()`, `apiMutate<T>()` para consumo tipado

### 4. Migração de todas as rotas

Todas as ~58 rotas migradas para usar os helpers:
- **Admin** (19 rotas): settings, barbers, shop-closures, shop-hours, financial, feedbacks, loyalty, services
- **Appointments** (9 rotas): CRUD, guest, cancel, feedback, no-show, reminder
- **Barbers** (13 rotas): público, me, appointments, clients, feedbacks, absences, financial, working-hours
- **Outros** (17 rotas): loyalty, profile, notifications, services, slots, dashboard, consent, cron, instagram, guest

### 5. Atualização do frontend

Todos os hooks e componentes atualizados:
- ~19 hooks: `data.entityName` → `data.data`
- Componentes: ProfileForm, DeleteAccountCard, InstagramSection, DailySchedule, AppointmentDetailSheet
- 7 arquivos de teste atualizados (441 testes passando)

### 6. Correção de inconsistências de erro

- `loyalty/account`: `{ error: "Unauthorized" }` → `apiError("UNAUTHORIZED", "Não autorizado", 401)`
- `loyalty/rewards` POST: `{ error: "Dados inválidos" }` → `apiError("VALIDATION_ERROR", "Dados inválidos", 400)`
- `loyalty/rewards/[id]/toggle`: `"Invalid request body"` → `apiError("VALIDATION_ERROR", "Dados inválidos", 400)`
- Todas as rotas com `{ error: "texto sem code" }` corrigidas para `apiError("ERROR_CODE", "texto", status)`

## Checklist

- [x] Definir padrão oficial de resposta (sucesso e erro)
- [x] Criar helpers `apiSuccess` e `apiError` em `src/lib/api/response.ts`
- [x] Migrar rotas admin para novo padrão
- [x] Migrar rotas de appointments para novo padrão
- [x] Migrar rotas de barbeiro para novo padrão
- [x] Migrar rotas de loyalty para novo padrão
- [x] Migrar rotas de perfil e notificações
- [x] Atualizar front-end para consumir formato padronizado
- [x] Documentar padrão de resposta para referência
- [x] `pnpm lint` passa
- [x] `pnpm test` passa (441 testes, 56 arquivos)
- [x] `pnpm build` passa
