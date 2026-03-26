# 006 - Implementar UI de resgates do cliente (histórico + códigos)

## Fase: 5 — UI Cliente (Feature nova)

## Prioridade: 🟡 MÉDIA (Complementa fluxo de resgate)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

Após a task 002 implementar os endpoints de resgate, o cliente precisa de UI para:
1. Ver o código gerado após resgatar uma recompensa (modal de sucesso já existe parcialmente)
2. Consultar seus resgates anteriores com status (pendente, usado, expirado)
3. Copiar o código de resgate para apresentar na barbearia

Atualmente não existe `GET /api/loyalty/redemptions` renderizado em nenhuma página.

## O que implementar

### 1. Modal de sucesso no resgate (rewards page)
- Após `POST /api/loyalty/redemptions` com sucesso, exibir modal/dialog com:
  - Código em destaque (fonte grande, monospace)
  - Botão copiar código
  - Data de validade do resgate
  - Nome da recompensa resgatada
  - CTA: "Apresente este código na barbearia"

### 2. Página/seção de "Meus Resgates"
- Opção A: Nova aba no layout de loyalty (`/loyalty/redemptions`)
- Opção B: Seção dentro do dashboard principal (`/loyalty`)
- Listar resgates com: nome da recompensa, código, data, status badge (Pendente/Usado/Expirado)
- Código copiável em cada item

### 3. Hook para listar resgates
- `useRedemptions` — GET `/api/loyalty/redemptions` com paginação

### 4. Componente `RedemptionCode`
- Componente reutilizável para exibir código de resgate com badge de status
- Suportar estados: PENDING (amarelo), USED (verde), EXPIRED (vermelho)

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/loyalty/__tests__/RedemptionCode.test.tsx` | **Criar PRIMEIRO** — testes do componente |
| `src/app/[locale]/(protected)/loyalty/redemptions/__tests__/page.test.tsx` | **Criar PRIMEIRO** — testes da página |
| `src/hooks/__tests__/useLoyalty.redemptions.test.tsx` | **Criar PRIMEIRO** — testes do hook |
| `src/components/loyalty/RedemptionCode.tsx` | **Criar** — componente de código |
| `src/app/[locale]/(protected)/loyalty/redemptions/page.tsx` | **Criar** — lista de resgates |
| `src/app/[locale]/(protected)/loyalty/rewards/page.tsx` | **Modificar** — melhorar modal de sucesso |
| `src/hooks/useLoyalty.ts` | **Modificar** — adicionar `useRedemptions` |
| `src/app/[locale]/(protected)/loyalty/layout.tsx` | **Modificar** — adicionar link nav |

## Dependências

- Task 002 (endpoints `POST` e `GET /api/loyalty/redemptions` implementados)

## Design

- Seguir Brand Book: dourado como accent, cards com `bg-card`, badges com cores do tier system
- Código em fonte monospace, tamanho destacado
- Status badges: Pendente (amber), Usado (green), Expirado (zinc/muted)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Testes componente — `RedemptionCode.test.tsx`

- [ ] Deve renderizar código em fonte monospace
- [ ] Deve exibir badge "Pendente" (amber) quando status PENDING
- [ ] Deve exibir badge "Usado" (green) quando status USED
- [ ] Deve exibir badge "Expirado" (muted) quando status EXPIRED
- [ ] Deve ter botão copiar que copia código para clipboard
- [ ] Deve exibir data de validade formatada

#### Testes da página — `redemptions/__tests__/page.test.tsx`

- [ ] Deve renderizar lista de resgates do usuário
- [ ] Deve exibir estado vazio quando sem resgates ("Nenhum resgate realizado")
- [ ] Deve exibir loading state enquanto carrega
- [ ] Deve exibir cada resgate com: nome recompensa, código, data, status
- [ ] Deve ter paginação funcional

#### Testes do hook — `useLoyalty.redemptions.test.tsx`

- [ ] `useRedemptions` deve chamar `GET /api/loyalty/redemptions` com page/limit
- [ ] Deve retornar data paginada corretamente

#### Testes modal de sucesso — integrado nos testes de rewards page

- [ ] Após resgate com sucesso, deve exibir modal com código em destaque
- [ ] Modal deve ter botão copiar código
- [ ] Modal deve exibir data de validade
- [ ] Modal deve exibir nome da recompensa resgatada

- [ ] Rodar `pnpm test` → confirmar que testes relevantes falham (RED)

### Mocks necessários

```typescript
// Para testes de RedemptionCode
// Nenhum mock necessário — componente puro

// Para testes da página
vi.mock("@/hooks/useLoyalty", () => ({
  useRedemptions: () => ({
    data: { data: mockRedemptions, pagination: mockPagination },
    isLoading: false,
  }),
}));

// Clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar componente `RedemptionCode.tsx` → rodar testes → GREEN
- [ ] Criar hook `useRedemptions` → rodar testes → GREEN
- [ ] Criar página `/loyalty/redemptions` → rodar testes → GREEN
- [ ] Melhorar modal de sucesso na rewards page → rodar testes → GREEN
- [ ] Adicionar link "Meus Resgates" na navegação do loyalty layout
- [ ] Adicionar i18n keys para textos (pt-BR e en)
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Verificar acessibilidade (ARIA labels no badge, botão copiar)
- [ ] Verificar responsividade da lista em mobile
- [ ] Extrair lógica de status derivado em utility se duplicada
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
