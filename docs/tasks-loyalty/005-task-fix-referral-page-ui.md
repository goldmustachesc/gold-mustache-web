# 005 - Corrigir página de indicação e conectar ao backend

## Fase: 5 — UI Cliente (Correções)

## Prioridade: 🟠 ALTA (Feature incompleta)

## Metodologia: TDD (Red → Green → Refactor)

## Problema

A página de referral (`/loyalty/referral`) tem UI funcional mas **não está conectada ao backend real**:

1. O código de indicação exibido é construído manualmente como `` `GM-${account.id.substring(0,6)}` `` em vez de usar o `referralCode` gerado pelo serviço e salvo no banco
2. Não há campo para o usuário **inserir** um código de indicação recebido de um amigo
3. Não há integração com o endpoint `POST /api/loyalty/referral/validate` (task 003)
4. Não há feedback visual sobre o status da indicação (pendente, bônus creditado)

## O que implementar

### 1. Exibir código de indicação correto
- Usar `account.referralCode` diretamente da API
- Manter funcionalidade de copiar para clipboard

### 2. Adicionar formulário "Fui indicado por"
- Input para inserir código de indicação de um amigo
- Botão de validar que chama `POST /api/loyalty/referral/validate`
- Feedback: nome do indicador (parcial) em caso de sucesso
- Estado disabled se o usuário já tem `referredById` definido

### 3. Criar hook `useValidateReferral`
- Mutation TanStack Query para `POST /api/loyalty/referral/validate`
- Invalidar query de `loyalty/account` após sucesso

### 4. Status de indicações
- Mostrar quantas indicações o usuário fez (count de `referrals` no account)
- Indicação visual de bônus pendente vs creditado

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/app/[locale]/(protected)/loyalty/referral/__tests__/page.test.tsx` | **Criar PRIMEIRO** — testes da página |
| `src/hooks/__tests__/useLoyalty.validate-referral.test.tsx` | **Criar PRIMEIRO** — teste do hook |
| `src/app/[locale]/(protected)/loyalty/referral/page.tsx` | **Modificar** — corrigir código, adicionar form |
| `src/hooks/useLoyalty.ts` | **Modificar** — adicionar `useValidateReferral` hook |

## Dependências

- Task 003 (endpoint `POST /api/loyalty/referral/validate` implementado)
- Task 004 (`referralCode` corretamente mapeado no hook)

## TDD Checklist

### Fase RED — Escrever testes primeiro (todos devem FALHAR)

#### Testes da página — `referral/__tests__/page.test.tsx`

- [ ] Deve renderizar o `referralCode` real do account (não `GM-${id}`)
- [ ] Deve ter botão de copiar que copia `referralCode` para clipboard
- [ ] Deve renderizar seção "Fui indicado por" com input e botão validar
- [ ] Deve desabilitar seção "Fui indicado por" quando `referredById` já preenchido
- [ ] Deve exibir nome parcial do referrer após validação com sucesso
- [ ] Deve exibir erro quando código inválido
- [ ] Deve exibir erro quando código é do próprio usuário
- [ ] Deve mostrar contagem de indicações feitas
- [ ] Deve compartilhar via WhatsApp com o código correto

#### Testes do hook — `useLoyalty.validate-referral.test.tsx`

- [ ] `useValidateReferral` deve chamar `POST /api/loyalty/referral/validate` com o código
- [ ] Deve invalidar query `loyalty/account` após sucesso
- [ ] Deve retornar erro quando API retorna 400/404

- [ ] Rodar `pnpm test` → confirmar que testes relevantes falham (RED)

### Mocks necessários

```typescript
// Hook mock para testes de página
const mockValidateReferral = vi.fn();
vi.mock("@/hooks/useLoyalty", () => ({
  useLoyaltyAccount: () => ({
    data: {
      referralCode: "ABC123",
      currentPoints: 500,
      referredById: null,
    },
    isLoading: false,
  }),
  useValidateReferral: () => ({
    mutate: mockValidateReferral,
    isPending: false,
  }),
}));

// Clipboard mock
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
```

### Fase GREEN — Implementar código mínimo para passar

- [ ] Substituir código hardcoded por `account.referralCode`
- [ ] Adicionar seção "Fui indicado por" com input + validação
- [ ] Criar hook `useValidateReferral` em `useLoyalty.ts`
- [ ] Desabilitar formulário se já indicado
- [ ] Mostrar contagem de indicações feitas
- [ ] Manter compartilhamento com código correto
- [ ] Rodar `pnpm test` → TODOS passam (GREEN)

### Fase REFACTOR — Limpar sem quebrar testes

- [ ] Extrair lógica de compartilhamento em utility se necessário
- [ ] Verificar acessibilidade (labels, aria, tab order)
- [ ] Rodar `pnpm test` → continua GREEN
- [ ] `pnpm lint` ✅ e `pnpm build` ✅

## Status: ✅ CONCLUÍDO
