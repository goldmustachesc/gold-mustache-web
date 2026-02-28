# 013 - Adicionar indexes faltantes no Prisma schema

## Status: ✅ IMPLEMENTADO

## Prioridade: 🟡 MÉDIA (Performance)

## Problema

Vários campos frequentemente usados em `WHERE` nas queries não possuem indexes no banco. Sem index, o PostgreSQL faz **full table scan** — percorre todas as linhas para encontrar o resultado. Conforme o volume de dados cresce, as queries ficam cada vez mais lentas.

## Indexes que existem hoje

```
ShopClosure      → @@index([date])
BarberAbsence    → @@index([barberId, date])
Appointment      → @@index([barberId, date, startTime])
Feedback         → @@index([barberId]), @@index([clientId]), @@index([guestClientId]), @@index([createdAt])
PointTransaction → @@index([loyaltyAccountId]), @@index([referenceId])
Redemption       → @@index([loyaltyAccountId]), @@index([rewardId]), @@index([code])
```

## Indexes adicionados

### 1. `Notification` — MAIS IMPACTANTE

Toda query de notificação filtra por `userId`:
- `getNotifications(userId)` → `where: { userId }`
- `getUnreadCount(userId)` → `where: { userId, read: false }`
- `markAsRead(id, userId)` → `where: { id, userId }`
- `markAllAsRead(userId)` → `where: { userId, read: false }`

**Adicionado:** `@@index([userId, read])` — index composto que cobre tanto queries por `userId` sozinho (via leftmost-prefix do PostgreSQL) quanto queries de "não lidas" (`userId + read`). O index individual `@@index([userId])` é redundante quando o composto existe.

### 2. `Appointment.clientId`

Queries de "meus agendamentos" filtram por `clientId`:
- `GET /api/appointments` → `where: { clientId: profileId }`
- `GET /api/dashboard/stats` → `where: { clientId: profileId }`

O index existente `[barberId, date, startTime]` **não ajuda** queries por `clientId`.

**Adicionado:** `@@index([clientId])`

### 3. `Appointment.guestClientId`

Guest lookups filtram por `guestClientId`:
- `GET /api/appointments/guest/lookup` → `where: { guestClientId }`

**Adicionado:** `@@index([guestClientId])`

### 4. `Appointment.status`

Muitas queries filtram por status (CONFIRMED, COMPLETED, etc.):
- Relatórios financeiros
- Listagens de agendamentos
- Verificação de overlaps

**Adicionado:** `@@index([status])`

### 5. `CookieConsent.userId` e `CookieConsent.anonymousId`

Queries de consentimento buscam por estes campos:
- `where: { userId }` para usuários logados
- `where: { anonymousId }` para anônimos

**Adicionado:** `@@index([userId])` e `@@index([anonymousId])`

## Implementação

### Schema (prisma/schema.prisma)

```prisma
model Notification {
  // ... campos existentes ...

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

### Migration

Migration criada manualmente em `prisma/migrations/20260228021853_add_missing_indexes/migration.sql` com `CREATE INDEX IF NOT EXISTS` para idempotência.

> **Nota:** Existe schema drift pré-existente no banco. A migration pode precisar ser aplicada via `psql` e marcada com `prisma migrate resolve --applied 20260228021853_add_missing_indexes`.

## Checklist

- [x] Adicionar `@@index([userId, read])` em Notification (composite cobre queries por `userId` sozinho)
- [x] Adicionar `@@index([clientId])` em Appointment
- [x] Adicionar `@@index([guestClientId])` em Appointment
- [x] Adicionar `@@index([status])` em Appointment
- [x] Adicionar `@@index([userId])` em CookieConsent
- [x] Adicionar `@@index([anonymousId])` em CookieConsent
- [x] Gerar migration (`20260228021853_add_missing_indexes`)
- [x] Validar schema (`prisma format` + `prisma generate`)
- [x] Build passa (`pnpm build`)
- [x] Lint passa (`pnpm lint`)
- [ ] Aplicar migration no banco e testar queries
