# 009 - Padronizar formato de resposta das APIs

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

## Checklist

- [ ] Definir padrão oficial de resposta (sucesso e erro)
- [ ] Criar helpers `apiSuccess` e `apiError` em `src/lib/api/response.ts`
- [ ] Migrar rotas admin para novo padrão
- [ ] Migrar rotas de appointments para novo padrão
- [ ] Migrar rotas de barbeiro para novo padrão
- [ ] Migrar rotas de loyalty para novo padrão
- [ ] Migrar rotas de perfil e notificações
- [ ] Atualizar front-end para consumir formato padronizado
- [ ] Documentar padrão de resposta para referência
