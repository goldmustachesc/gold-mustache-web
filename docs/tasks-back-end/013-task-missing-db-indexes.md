# 013 - Adicionar indexes faltantes no Prisma schema

## Prioridade: 🟡 MÉDIA (Performance)

## Problema

Vários campos frequentemente usados em `WHERE` nas queries não possuem indexes no banco. Sem index, o PostgreSQL faz **full table scan** — percorre todas as linhas para encontrar o resultado. Conforme o volume de dados cresce, as queries ficam cada vez mais lentas.

## Indexes que existem hoje

```
ShopClosure     → @@index([date])
BarberAbsence   → @@index([barberId, date])
Appointment     → @@index([barberId, date, startTime])
Feedback        → @@index([barberId]), @@index([clientId]), @@index([guestClientId]), @@index([createdAt])
PointTransaction → @@index([loyaltyAccountId]), @@index([referenceId])
Redemption      → @@index([loyaltyAccountId]), @@index([rewardId]), @@index([code])
```

## Indexes faltantes

### 1. `Notification.userId` — MAIS IMPACTANTE

Toda query de notificação filtra por `userId`:
- `getNotifications(userId)` → `where: { userId }`
- `getUnreadCount(userId)` → `where: { userId, read: false }`
- `markAsRead(id, userId)` → `where: { id, userId }`
- `markAllAsRead(userId)` → `where: { userId, read: false }`

**Adicionar:** `@@index([userId])` no model `Notification`

Considerar também index composto: `@@index([userId, read])` para a query de "não lidas".

### 2. `Appointment.clientId`

Queries de "meus agendamentos" filtram por `clientId`:
- `GET /api/appointments` → `where: { clientId: profileId }`
- `GET /api/dashboard/stats` → `where: { clientId: profileId }`

O index existente `[barberId, date, startTime]` **não ajuda** queries por `clientId`.

**Adicionar:** `@@index([clientId])`

### 3. `Appointment.guestClientId`

Guest lookups filtram por `guestClientId`:
- `GET /api/appointments/guest/lookup` → `where: { guestClientId }`

**Adicionar:** `@@index([guestClientId])`

### 4. `Appointment.status`

Muitas queries filtram por status (CONFIRMED, COMPLETED, etc.):
- Relatórios financeiros
- Listagens de agendamentos
- Verificação de overlaps

**Adicionar:** `@@index([status])` ou melhorar o existente para `@@index([barberId, date, status])`

### 5. `CookieConsent.userId` e `CookieConsent.anonymousId`

Queries de consentimento buscam por estes campos:
- `where: { userId }` para usuários logados
- `where: { anonymousId }` para anônimos

**Adicionar:** `@@index([userId])` e `@@index([anonymousId])`

## Como aplicar

```prisma
model Notification {
  // ... campos existentes ...

  @@index([userId])
  @@index([userId, read])
  @@map("notifications")
}

model Appointment {
  // ... campos existentes ...

  @@index([barberId, date, startTime])
  @@index([clientId])
  @@index([guestClientId])
  @@index([status])
  @@map("appointments")
}

model CookieConsent {
  // ... campos existentes ...

  @@index([userId])
  @@index([anonymousId])
  @@map("cookie_consents")
}
```

Depois rodar:
```bash
pnpm prisma migrate dev --name add-missing-indexes
```

## Checklist

- [ ] Adicionar `@@index([userId])` e `@@index([userId, read])` em Notification
- [ ] Adicionar `@@index([clientId])` em Appointment
- [ ] Adicionar `@@index([guestClientId])` em Appointment
- [ ] Adicionar `@@index([status])` em Appointment
- [ ] Adicionar `@@index([userId])` em CookieConsent
- [ ] Adicionar `@@index([anonymousId])` em CookieConsent
- [ ] Gerar e aplicar migration
- [ ] Testar que queries de notificação, agendamentos e consentimento continuam funcionando
