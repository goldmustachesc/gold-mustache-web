# 002 - Adicionar autenticação no GET /api/admin/settings

## Prioridade: 🔴 CRÍTICA (Segurança)

## Problema

O endpoint `GET /api/admin/settings` retorna as configurações da barbearia **sem exigir autenticação**. Qualquer pessoa pode acessar diretamente e obter dados internos (email, telefone, coordenadas, URLs de configuração).

O `PUT` exige `requireAdmin()` corretamente, mas o `GET` foi esquecido.

## Arquivo afetado

- `src/app/api/admin/settings/route.ts` — função `GET()` (linha 37)

## O que corrigir

Adicionar `requireAdmin()` no início da função `GET`, igual ao `PUT`:

```typescript
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  // ... resto da lógica
}
```

## Impacto

- **Sem a correção:** Qualquer pessoa na internet pode ler configurações internas da barbearia.
- **Com a correção:** Apenas administradores autenticados podem acessar.

## Observação

Verificar se alguma parte do front-end público consome esse endpoint. Se sim, criar um endpoint separado `/api/settings/public` que retorne apenas dados não sensíveis (nome, tagline, booking habilitado).

## Checklist

- [ ] Adicionar `requireAdmin()` no `GET`
- [ ] Verificar se front-end público depende desse endpoint
- [ ] Se sim, criar endpoint público alternativo com dados limitados
- [ ] Testar acesso sem auth (deve retornar 401)
- [ ] Testar acesso com auth não-admin (deve retornar 403)
- [ ] Testar acesso com auth admin (deve retornar 200)
