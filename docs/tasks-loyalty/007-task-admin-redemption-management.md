# 007 - Implementar gestão de resgates no admin

## Fase: 6 — Admin UI (Feature nova)

## Prioridade: 🟠 ALTA (Operacional — necessário para a barbearia usar os resgates)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

Quando um cliente apresenta um código de resgate na barbearia, o admin precisa de uma forma de **validar e marcar como usado**. Atualmente não existe essa funcionalidade na UI. Sem isso, o sistema de resgates não tem utilidade prática.

## O que implementar

### 1. Nova aba "Resgates" no admin loyalty

Adicionar uma terceira aba na página `admin/loyalty` (ao lado de "Contas" e "Catálogo"):

**Seção superior: Validar Código**
- Input para inserir/escanear código de 6 caracteres
- Botão "Validar"
- Ao validar, exibir card com:
  - Nome do cliente
  - Recompensa resgatada (nome, tipo, valor)
  - Data do resgate
  - Validade
  - Status (Pendente / Usado / Expirado)
- Botão "Marcar como Usado" (só se status = Pendente)

**Seção inferior: Resgates Recentes**
- Tabela com últimos resgates (todas as contas)
- Colunas: Cliente, Recompensa, Código, Data, Status, Ação
- Filtros: status (todos, pendente, usado, expirado)

### 2. Hooks admin

- `useAdminValidateRedemption` — mutation para validar código
- `useAdminUseRedemption` — mutation para marcar como usado
- `useAdminRedemptions` — query para listar resgates recentes (pode precisar de novo endpoint GET)

### 3. Endpoint admin adicional (se necessário)

`GET /api/admin/loyalty/redemptions` — Listar todos os resgates com filtros. Diferente do endpoint cliente, este retorna resgates de **todos** os clientes.

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/api/admin/loyalty/redemptions/__tests__/route.test.ts` | **Criar PRIMEIRO** — testes do GET endpoint |
| `src/hooks/__tests__/useAdminLoyalty.redemptions.test.tsx` | **Criar PRIMEIRO** — testes dos hooks |
| `src/app/[locale]/(protected)/admin/loyalty/__tests__/redemptions-tab.test.tsx` | **Criar PRIMEIRO** — testes da UI |
| `src/app/api/admin/loyalty/redemptions/route.ts` | **Criar** — GET listar resgates |
| `src/app/[locale]/(protected)/admin/loyalty/page.tsx` | **Modificar** — adicionar aba "Resgates" |
| `src/hooks/useAdminLoyalty.ts` | **Modificar** — adicionar hooks de redemption |

## Padrão de referência

Seguir o padrão já existente na admin loyalty page:
- Tabs com `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` do shadcn
- Tabelas com layout consistente
- Dialogs para confirmação de ações
- Loading states com `Loader2`

## Dependências

- Task 002 (endpoint `POST /api/admin/loyalty/redemptions/use`)
- Task 001 (`validateRedemptionCode` no rewards.service.ts)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Testes do endpoint — `redemptions/__tests__/route.test.ts`

**Testes `GET /api/admin/loyalty/redemptions`:**
- [ ] Deve retornar 401/403 quando não admin
- [ ] Deve retornar 200 com lista paginada de todos os resgates
- [ ] Deve incluir dados do cliente (nome, email) em cada resgate
- [ ] Deve filtrar por status quando query param `status` presente
- [ ] Deve retornar lista vazia quando sem resgates

#### Testes dos hooks — `useAdminLoyalty.redemptions.test.tsx`

- [ ] `useAdminValidateRedemption` deve chamar service de validação
- [ ] `useAdminUseRedemption` deve chamar `POST /api/admin/loyalty/redemptions/use`
- [ ] `useAdminUseRedemption` deve invalidar queries de redemptions após sucesso
- [ ] `useAdminRedemptions` deve chamar `GET /api/admin/loyalty/redemptions`

#### Testes da UI — `redemptions-tab.test.tsx`

- [ ] Deve renderizar aba "Resgates" no TabsList
- [ ] Deve renderizar input de código com botão "Validar"
- [ ] Ao validar código existente, deve exibir card com dados do resgate
- [ ] Card deve mostrar botão "Marcar como Usado" quando status = Pendente
- [ ] Card NÃO deve mostrar botão quando status = Usado ou Expirado
- [ ] Deve exibir tabela de resgates recentes
- [ ] Deve ter filtro de status (todos, pendente, usado, expirado)
- [ ] Botão "Marcar como Usado" deve exibir dialog de confirmação
- [ ] Após confirmar, deve chamar hook e atualizar tabela

- [ ] Rodar `pnpm test` → confirmar que testes relevantes falham (RED)

### Mocks necessários

```typescript
// Admin auth
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Hooks para testes de UI
vi.mock("@/hooks/useAdminLoyalty", () => ({
  useAdminRedemptions: () => ({
    data: { data: mockRedemptions, pagination: mockPagination },
    isLoading: false,
  }),
  useAdminValidateRedemption: () => ({
    mutateAsync: mockValidate,
    isPending: false,
  }),
  useAdminUseRedemption: () => ({
    mutate: mockUseRedemption,
    isPending: false,
  }),
}));
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Criar `GET /api/admin/loyalty/redemptions` com requireAdmin + paginação + filtro
- [ ] Rodar testes endpoint → GREEN
- [ ] Criar hooks em `useAdminLoyalty.ts`
- [ ] Rodar testes hooks → GREEN
- [ ] Adicionar aba "Resgates" com validação e tabela
- [ ] Rodar testes UI → GREEN
- [ ] Adicionar i18n keys
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Extrair componente de validação de código (reutilizável)
- [ ] Verificar UX: loading states, error states, empty states
- [ ] Verificar consistência visual com as outras abas
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
