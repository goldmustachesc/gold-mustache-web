# 004 - Corrigir inconsistências de mapeamento hooks ↔ API

## Fase: 5 — UI Cliente (Correções)

## Prioridade: 🔴 CRÍTICA (Bug — UI exibe dados errados)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

Existem inconsistências entre o que a API retorna e o que os hooks/componentes esperam. Isso causa dados exibidos como `0`, `undefined`, ou comportamentos errados no frontend.

### Inconsistência 1: `currentPoints` vs `points`

A API `GET /api/loyalty/account` retorna o campo Prisma `currentPoints`, mas o hook `useLoyaltyAccount` e os componentes (LoyaltyCard, RewardCard) podem esperar `points`. Isso resulta em saldo exibido como 0.

### Inconsistência 2: `referralCode` não mapeado no hook

A API retorna `referralCode` do Prisma, mas a referral page constrói o código manualmente com `` `GM-${account.id.substring(0,6)}` `` em vez de usar `account.referralCode`.

### Inconsistência 3: Admin catalog usa API pública

O admin loyalty page usa `useRewards` (que chama `GET /api/loyalty/rewards` — API pública) para listar o catálogo. Essa rota filtra `active: true`, então o admin **não vê rewards inativos** e não pode reativá-los.

### Inconsistência 4: Mock fallback no rewards page

A rewards page do cliente tem um fallback que renderiza rewards mockados quando a API falha, mascarando erros reais de rede.

## O que corrigir

### Para inconsistência 1:
- Definir um tipo `LoyaltyAccountResponse` explícito na API
- Alinhar o hook para usar os campos corretos
- Ou: adicionar transform no hook para mapear `currentPoints` → `points` se a API não mudar

### Para inconsistência 2:
- Na referral page, usar `account.referralCode` diretamente em vez de construir manualmente

### Para inconsistência 3:
- Criar hook `useAdminRewards` que chama `GET /api/admin/loyalty/rewards` (já retorna todos, inclusive inativos)
- Usar esse hook no admin loyalty page em vez de `useRewards`

### Para inconsistência 4:
- Remover o array de rewards mock do fallback
- Exibir estado de erro real com opção de retry

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/__tests__/useLoyalty.test.tsx` | **Criar/Modificar PRIMEIRO** — testes de mapeamento |
| `src/components/loyalty/__tests__/LoyaltyCard.test.tsx` | **Criar/Modificar PRIMEIRO** — testes de renderização |
| `src/hooks/useLoyalty.ts` | Campo `points` vs `currentPoints` |
| `src/app/[locale]/(protected)/loyalty/referral/page.tsx` | Código referral hardcoded |
| `src/app/[locale]/(protected)/admin/loyalty/page.tsx` | Usa hook público para catalog |
| `src/app/[locale]/(protected)/loyalty/rewards/page.tsx` | Mock fallback mascarando erros |
| `src/hooks/useAdminLoyalty.ts` | Pode precisar de hook para rewards admin |

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Testes de hook — `src/hooks/__tests__/useLoyalty.test.tsx`

- [ ] `useLoyaltyAccount` deve retornar `currentPoints` (ou campo alinhado) a partir da API response
- [ ] `useLoyaltyAccount` deve incluir `referralCode` no retorno
- [ ] `useLoyaltyAccount` deve incluir `tier` e `lifetimePoints` mapeados corretamente
- [ ] O tipo retornado pelo hook deve satisfazer a interface `LoyaltyAccountResponse`

#### Testes de componente — `src/components/loyalty/__tests__/LoyaltyCard.test.tsx`

- [ ] `LoyaltyCard` deve renderizar o saldo de pontos corretamente (não `0` ou `undefined`)
- [ ] `LoyaltyCard` deve renderizar o tier badge correto
- [ ] `TierProgress` deve calcular progresso com base nos campos corretos

#### Testes de page — rewards

- [ ] Rewards page deve exibir estado de erro (não mock data) quando API falha
- [ ] Rewards page deve ter botão de retry no estado de erro

#### Testes de admin hook

- [ ] `useAdminRewards` deve chamar `GET /api/admin/loyalty/rewards` (não a rota pública)

- [ ] Rodar `pnpm test` → confirmar que testes relevantes falham (RED)

### Fase GREEN — Implementar correções mínimas para passar

- [ ] Definir tipo `LoyaltyAccountResponse` e alinhar API + hook + componentes
- [ ] Corrigir referral page para usar `account.referralCode`
- [ ] Criar/ajustar hook `useAdminRewards` para chamar rota admin
- [ ] Remover mock fallback na rewards page e implementar error state real
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar que todos os componentes usando loyalty data usam os tipos corretos
- [ ] Remover qualquer type assertion desnecessária
- [ ] Verificar LoyaltyCard, TierBadge, TierProgress usam os campos corretos
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
