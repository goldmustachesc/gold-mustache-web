# 018 - Revisar segurança de transações em operações multi-step

## Prioridade: 🟢 BAIXA (Integridade de dados)

## Problema

Algumas operações modificam múltiplos registros sequencialmente sem usar transações do Prisma. Se o servidor cair no meio da operação, os dados ficam em estado inconsistente.

O booking já usa transactions corretamente (com advisory lock), mas outras operações não.

## Casos identificados

### 1. Delete request de guest
**`src/app/api/guest/delete-request/route.ts`** (linha 85)

Faz `prisma.guestClient.update()` isolado. Quando a implementação evoluir para anonimizar guest + mover appointments, precisará de transaction.

### 2. Cleanup de guests (cron)
**`src/app/api/cron/cleanup-guests/route.ts`** (linhas 80-93)

Processa batches em transactions individuais, mas a deleção de user no Supabase (`admin.auth.deleteUser()`) acontece **fora** da transaction. Se o Supabase falhar, o perfil fica deletado no banco mas o auth user continua existindo.

```typescript
// Fluxo atual:
await prisma.$transaction([...]); // OK - deleta do banco
await supabase.auth.admin.deleteUser(userId); // Fora da transaction - pode falhar
```

### 3. Profile delete
**`src/app/api/profile/delete/route.ts`**

Similar ao cleanup — deleção do profile no Prisma e deleção do auth user no Supabase são operações separadas.

## O que corrigir

Para operações que envolvem Prisma + Supabase Auth:
- Deletar primeiro no Supabase Auth (mais difícil de reverter)
- Depois deletar no Prisma (mais fácil de reverter/retry)
- Ou implementar pattern de compensação (se Prisma falhar, recriar user no Supabase)

```typescript
// ✅ Ordem mais segura
try {
  // 1. Deletar auth user primeiro (operação externa)
  await supabase.auth.admin.deleteUser(userId);

  // 2. Deletar dados no banco (pode retry se falhar)
  await prisma.$transaction([
    prisma.appointment.updateMany({ where: { clientId }, data: { clientId: null } }),
    prisma.profile.delete({ where: { id: profileId } }),
  ]);
} catch (error) {
  // Se o passo 2 falhar, o user auth já foi deletado
  // Log para retry manual ou compensação
  console.error("Partial delete - auth deleted but DB failed:", error);
}
```

## Checklist

- [x] Revisar ordem de operações no profile delete
- [x] Revisar ordem de operações no cron cleanup-guests
- [x] Documentar padrão de "operação externa primeiro, banco depois"
- [x] Adicionar log/alerta para operações parcialmente completadas
- [ ] Considerar dead-letter queue para operações falhadas (futuro)
