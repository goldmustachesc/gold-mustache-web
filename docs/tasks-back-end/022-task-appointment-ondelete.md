# 022 - Definir onDelete nas relações de Appointment com Profile/GuestClient

## Prioridade: 🟢 BAIXA (Integridade de dados)

## Problema

O model `Appointment` tem relações com `Profile` e `GuestClient` sem `onDelete` definido:

```prisma
model Appointment {
  clientId      String?  @map("client_id")
  guestClientId String?  @map("guest_client_id")

  client      Profile?     @relation(fields: [clientId], references: [id])        // ❌ sem onDelete
  guestClient GuestClient? @relation(fields: [guestClientId], references: [id])   // ❌ sem onDelete

  barber  Barber  @relation(fields: [barberId], references: [id], onDelete: Restrict)   // ✅
  service Service @relation(fields: [serviceId], references: [id], onDelete: Restrict)  // ✅
}
```

Sem `onDelete`, o PostgreSQL usa o comportamento padrão (`NO ACTION` / `RESTRICT`), que **bloqueia** a deleção de Profile ou GuestClient se existirem appointments vinculados.

Isso significa que:
- `DELETE FROM profiles WHERE id = '...'` falha com FK constraint violation
- A aplicação precisa manualmente limpar os appointments antes de deletar o profile

## Comparação com outras relações

| Relação | onDelete | Comportamento |
|---------|----------|---------------|
| `Appointment → Barber` | `Restrict` | ✅ Explicito — não pode deletar barbeiro com agendamentos |
| `Appointment → Service` | `Restrict` | ✅ Explicito — não pode deletar serviço com agendamentos |
| `Appointment → Profile` | (nenhum) | ❌ Implícito — falha silenciosamente |
| `Appointment → GuestClient` | (nenhum) | ❌ Implícito — falha silenciosamente |
| `Feedback → Profile` | `SetNull` | ✅ Explicito — mantém feedback, remove referência |

## O que corrigir

Definir explicitamente o comportamento:

```prisma
model Appointment {
  // Quando profile é deletado, manter appointment mas remover vínculo
  client      Profile?     @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Quando guest é deletado (LGPD), manter appointment mas remover vínculo
  guestClient GuestClient? @relation(fields: [guestClientId], references: [id], onDelete: SetNull)
}
```

`SetNull` é a melhor opção porque:
- Mantém o histórico de agendamentos (importante para relatórios financeiros)
- Permite deletar/anonimizar perfis (LGPD compliance)
- O appointment fica como "cliente removido" em vez de ser perdido

## Checklist

- [x] Adicionar `onDelete: SetNull` na relação `Appointment → Profile`
- [x] Adicionar `onDelete: SetNull` na relação `Appointment → GuestClient`
- [x] Gerar migration — já presente na baseline migration
- [x] Verificar que o profile delete route funciona corretamente com a nova cascade
- [x] Verificar que o cron cleanup-guests funciona corretamente
- [x] Testar que agendamentos não são deletados quando profile é removido
