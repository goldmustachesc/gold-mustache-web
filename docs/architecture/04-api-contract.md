# Gold Mustache — Contrato da API

> Especificação completa de todas as rotas REST da aplicação.
> Todas as rotas estão em `src/app/api/`.

---

## Autenticação

O sistema usa 4 mecanismos de autenticação:

| Tipo | Como funciona | Header/Cookie |
|------|---------------|---------------|
| **Supabase Session** | Cookie de sessão renovado pelo middleware | Cookie automático |
| **Admin** | Supabase + `Profile.role === ADMIN` | Cookie automático |
| **Barber** | Supabase + registro na tabela `Barber` | Cookie automático |
| **Guest Token** | UUID gerado no booking | `X-Guest-Token: <uuid>` |
| **Cron Secret** | Token compartilhado | `Authorization: Bearer <CRON_SECRET>` |

---

## Formato de Resposta

### Sucesso

```json
{ "appointments": [...] }
{ "settings": {...} }
{ "success": true, "data": {...}, "meta": { "total": 100, "page": 1 } }
```

### Erro

```json
{
  "error": "ERROR_CODE",
  "message": "Mensagem amigável em português",
  "details": {}
}
```

> **Nota:** O formato não é 100% consistente entre rotas — ver [task 009](../tasks-back-end/009-task-response-format-inconsistente.md).

---

## 1. Rotas Públicas

### GET /api/services

Retorna serviços ativos.

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Query | `barberId` (uuid, opcional) — filtra por barbeiro |
| Sucesso (200) | `{ services: [{ id, slug, name, description, duration, price, active }] }` |
| Erros | 500 |

### GET /api/barbers

Retorna barbeiros ativos.

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Sucesso (200) | `{ barbers: [{ id, name, avatarUrl }] }` |
| Erros | 500 |

### GET /api/slots

Retorna horários disponíveis para agendamento.

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Query | `date` (YYYY-MM-DD, obrigatório), `barberId` (uuid, obrigatório), `serviceId` (uuid, obrigatório) |
| Sucesso (200) | `{ slots: [{ time: "10:30", available: true }] }` |
| Erros | 422 (params inválidos), 500 |

### GET /api/instagram/posts

Retorna posts do Instagram do cache.

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Sucesso (200) | `{ posts: [...], lastUpdated, source }` |
| Erros | Fallback para mock se cache falhar |

---

## 2. Auth Callback

### GET /[locale]/auth/callback

Processa callback de autenticação (email verification, OAuth).

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Query | `code` (string), `type` (signup/email_change), `next` (path, default "/dashboard") |
| Sucesso | Redirect para `{origin}{next}` |
| Erro | Redirect para `/login?error=auth_callback_error` |

---

## 3. Agendamentos — Cliente Autenticado

### GET /api/appointments

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Query | `startDate` (YYYY-MM-DD, opcional), `endDate` (opcional), `barberId` (opcional) |
| Sucesso (200) | `{ appointments: [{ id, date, startTime, endTime, status, service: {...}, barber: {...} }] }` |
| Erros | 401, 500 |

### POST /api/appointments

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Rate Limit | `appointments` (10/min) |
| Body | `{ serviceId: uuid, barberId: uuid, date: "YYYY-MM-DD", startTime: "HH:MM" }` |
| Sucesso (201) | `{ appointment: {...} }` |
| Erros | 400, 401, 403 (booking disabled), 409 (slot ocupado), 422, 429, 500 |

### PATCH /api/appointments/[id]/cancel

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session (client ou barber) |
| Body | `{ reason: string }` (obrigatório para barbeiro) |
| Sucesso (200) | `{ appointment: {...} }` |
| Erros | 400, 401, 404, 500 |

### PATCH /api/appointments/[id]/no-show

| Campo | Valor |
|-------|-------|
| Auth | Barbeiro |
| Sucesso (200) | `{ appointment: {...} }` |
| Erros | 403, 404, 409, 412, 500 |

### POST /api/appointments/[id]/reminder

| Campo | Valor |
|-------|-------|
| Auth | Barbeiro |
| Sucesso (200) | `{ success, type, message?, whatsappUrl? }` |
| Erros | 400, 401, 403, 404, 500 |

### GET /api/appointments/[id]/feedback

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Sucesso (200) | `{ feedback: { id, rating, comment, createdAt } }` |
| Erros | 401, 403, 404, 500 |

### POST /api/appointments/[id]/feedback

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Body | `{ rating: number (1-5), comment?: string }` |
| Sucesso (201) | `{ feedback: {...} }` |
| Erros | 400, 403, 404, 409 (já avaliou), 500 |

---

## 4. Agendamentos — Convidado (Guest)

### POST /api/appointments/guest

| Campo | Valor |
|-------|-------|
| Auth | Nenhuma |
| Rate Limit | `guestAppointments` (5/min) |
| Body | `{ serviceId, barberId, date, startTime, clientName, clientPhone }` |
| Sucesso (201) | `{ appointment: {...}, accessToken: "uuid" }` |
| Erros | 400, 403, 409, 422, 429, 500 |

### GET /api/appointments/guest/lookup

| Campo | Valor |
|-------|-------|
| Auth | Guest Token (`X-Guest-Token`) |
| Sucesso (200) | `{ appointments: [...] }` |
| Erros | 401, 500 |

### PATCH /api/appointments/guest/[id]/cancel

| Campo | Valor |
|-------|-------|
| Auth | Guest Token (`X-Guest-Token`) |
| Sucesso (200) | `{ appointment: {...} }` |
| Erros | 400, 401, 403, 404, 500 |

### GET /api/appointments/guest/[id]/feedback

| Campo | Valor |
|-------|-------|
| Auth | Guest Token (`x-guest-token`) |
| Sucesso (200) | `{ feedback: {...} }` |
| Erros | 401, 403, 404, 500 |

### POST /api/appointments/guest/[id]/feedback

| Campo | Valor |
|-------|-------|
| Auth | Guest Token (`x-guest-token`) |
| Body | `{ rating: number, comment?: string }` |
| Sucesso (201) | `{ feedback: {...} }` |
| Erros | 400, 403, 404, 409, 500 |

---

## 5. Perfil

### GET /api/profile/me

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Sucesso (200) | `{ profile: { id, fullName, phone, avatarUrl, role, emailVerified, ... }, email }` |
| Erros | 401, 500 |

### PUT /api/profile/me

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Body | `{ fullName?, phone?, street?, number?, complement?, neighborhood?, city?, state?, zipCode? }` |
| Sucesso (200) | `{ profile: {...} }` |
| Erros | 400, 401, 500 |

### GET /api/profile/export

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session |
| Rate Limit | `sensitive` (3/min) |
| Sucesso (200) | JSON com perfil, agendamentos, feedbacks, consentimentos |
| Erros | 401, 404, 429, 500 |

### DELETE /api/profile/delete

| Campo | Valor |
|-------|-------|
| Auth | Supabase Session + Origin Check (CSRF) |
| Rate Limit | `sensitive` (3/min) |
| Sucesso (200) | `{ success: true, message }` |
| Erros | 401, 429, 500 |

---

## 6. Painel do Barbeiro

Todas as rotas exigem **Supabase Session + registro na tabela Barber**.

### GET /api/barbers/me
Retorna perfil do barbeiro logado. Resposta: `{ barber: { id, name, avatarUrl } }`

### GET /api/barbers/me/working-hours
Retorna horários de trabalho. Resposta: `{ days: [...] }`

### PUT /api/barbers/me/working-hours
Body: `{ days: [{ dayOfWeek, isWorking, startTime?, endTime?, breakStart?, breakEnd? }] }`

### GET /api/barbers/me/appointments
Query: `startDate`, `endDate` (YYYY-MM-DD). Resposta: `{ appointments: [...] }`

### POST /api/barbers/me/appointments
Body: `{ serviceId, date, startTime, clientName, clientPhone }`. Resposta (201): `{ appointment }`

### GET /api/barbers/me/absences
Query: `startDate?`, `endDate?`. Resposta: `{ absences: [...] }`

### POST /api/barbers/me/absences
Body: `{ date, startTime?, endTime?, reason? }`. Resposta (201): `{ absence }`

### DELETE /api/barbers/me/absences/[id]
Resposta: `{ ok: true }`

### GET /api/barbers/me/clients
Query: `search` (opcional). Resposta: `{ clients: [...] }`

### POST /api/barbers/me/clients
Body: `{ fullName, phone }`. Resposta (201): `{ client }`

### PATCH /api/barbers/me/clients/[id]
Body: `{ fullName, phone }`. Resposta: `{ client }`

### GET /api/barbers/me/clients/[id]/appointments
Resposta: `{ appointments: [...] }`

### GET /api/barbers/me/cancelled-appointments
Resposta: `{ appointments: [...] }`

### GET /api/barbers/me/financial
Query: `month` (1-12), `year` (2020-2100). Resposta: `{ stats, barberName }`

### GET /api/barbers/me/feedbacks
Query: `page?`, `pageSize?`. Resposta: feedbacks paginados

### GET /api/barbers/me/feedbacks/stats
Resposta: `{ stats: { averageRating, totalFeedbacks, distribution } }`

---

## 7. Admin

Todas as rotas de escrita exigem **`requireAdmin()`** (Supabase + `Profile.role === ADMIN`).

### Configuracoes

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/settings | — | `{ settings }` |
| PUT | /api/admin/settings | `{ name?, shortName?, tagline?, phone?, whatsapp?, bookingEnabled?, ... }` | `{ settings }` |

### Horarios da Loja

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/shop-hours | — | `{ days }` |
| PUT | /api/admin/shop-hours | `{ days: [...] }` | `{ days }` |

### Fechamentos

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/shop-closures | `startDate?`, `endDate?` | `{ closures }` |
| POST | /api/admin/shop-closures | `{ date, startTime?, endTime?, reason? }` | `{ closure }` (201) |
| DELETE | /api/admin/shop-closures/[id] | — | `{ ok: true }` |

### Servicos

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/services | — | `{ services }` |
| POST | /api/admin/services | `{ name, description?, duration, price }` | `{ service }` (201) |
| GET | /api/admin/services/[id] | — | `{ service }` |
| PUT | /api/admin/services/[id] | `{ name?, description?, duration?, price?, active? }` | `{ service }` |
| DELETE | /api/admin/services/[id] | — | `{ service, message }` |

### Barbeiros

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/barbers | — | `{ barbers }` |
| POST | /api/admin/barbers | `{ name, email?, avatarUrl? }` | `{ barber }` (201) |
| GET | /api/admin/barbers/[id] | — | `{ barber }` |
| PUT | /api/admin/barbers/[id] | `{ name?, avatarUrl?, active? }` | `{ barber }` |
| DELETE | /api/admin/barbers/[id] | — | `{ success, message }` |
| GET | /api/admin/barbers/[id]/working-hours | — | `{ barber, days }` |
| PUT | /api/admin/barbers/[id]/working-hours | `{ days: [...] }` | `{ barber, days }` |
| GET | /api/admin/barbers/[id]/feedbacks | `page?`, `pageSize?`, `includeStats?` | `{ barber, feedbacks, stats? }` |
| GET | /api/admin/barbers/ranking | — | `{ ranking }` |

### Feedbacks

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/feedbacks | `page?`, `pageSize?`, `barberId?`, `rating?`, `startDate?`, `endDate?`, `hasComment?` | Paginado |
| GET | /api/admin/feedbacks/stats | — | `{ stats }` |

### Financeiro

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/financial | `month` (1-12), `year`, `barberId?` | `{ stats, barberName?, barbers }` |

### Fidelidade (Admin)

> **ATENCAO:** Estas rotas atualmente NAO possuem `requireAdmin()` — ver [task 001](../tasks-back-end/001-task-admin-loyalty-sem-auth.md).

| Metodo | Path | Body/Query | Resposta |
|--------|------|-----------|----------|
| GET | /api/admin/loyalty/accounts | — | `{ success, accounts }` (mock) |
| POST | /api/admin/loyalty/accounts/[accountId]/adjust | `{ points, reason }` | `{ success, message }` (mock) |
| GET | /api/admin/loyalty/rewards | — | `{ success, rewards }` |
| POST | /api/admin/loyalty/rewards | `{ name, pointsCost, type, ... }` | `{ success, data }` (201) |
| GET | /api/admin/loyalty/rewards/[id] | — | `{ success, data }` |
| PUT | /api/admin/loyalty/rewards/[id] | campos opcionais | `{ success, data }` |
| DELETE | /api/admin/loyalty/rewards/[id] | — | `{ success, message }` |
| PUT | /api/admin/loyalty/rewards/[id]/toggle | `{ active: boolean }` | `{ success, data }` |

---

## 8. Fidelidade (Cliente)

### GET /api/loyalty/account
Auth: Supabase. Resposta: `{ success, account: { id, currentPoints, lifetimePoints, tier, referralCode } }`

### GET /api/loyalty/rewards
Auth: Nenhuma. Resposta: `{ success, rewards: [...] }` (apenas ativos)

### GET /api/loyalty/transactions
Auth: Supabase. Query: `limit?` (default 10), `page?` (default 1). Resposta: `{ success, data, meta }`

---

## 9. Notificacoes

### GET /api/notifications
Auth: Supabase. Resposta: `{ notifications: [...], unreadCount }`

### PATCH /api/notifications/mark-all-read
Auth: Supabase. Resposta: `{ success: true }`

### PATCH /api/notifications/[id]/read
Auth: Supabase. Resposta: `{ success: true }`

---

## 10. Consentimento LGPD

### GET /api/consent
Query: `anonymousId?` (uuid). Resposta: `{ consent?, hasConsent? }`

### POST /api/consent
Body: `{ analyticsConsent: boolean, marketingConsent: boolean, anonymousId?: uuid }`. Resposta (201): `{ consent, message }`

---

## 11. Dashboard

### GET /api/dashboard/stats
Auth: Supabase. Resposta: `{ stats: { role, client: {...}, barber?: {...}, admin?: {...} } }`

---

## 12. Guest Delete Request

### POST /api/guest/delete-request
Rate Limit: `sensitive` (3/min). Body: `{ phone, accessToken? }`. Resposta: `{ success, message }`

---

## 13. Cron Jobs

### POST /api/cron/sync-instagram
Auth: `Authorization: Bearer {CRON_SECRET}`. Resposta: `{ success, postsCount, lastUpdated }`

### POST /api/cron/cleanup-guests
Auth: `Authorization: Bearer {CRON_SECRET}`. Resposta: `{ success, message, anonymized, cutoffDate }`

---

## Rate Limiting

| Limiter | Limite | Rotas |
|---------|--------|-------|
| `appointments` | 10 req/min | POST /api/appointments |
| `guestAppointments` | 5 req/min | POST /api/appointments/guest |
| `api` | 100 req/min | (disponivel, nao aplicado em rotas publicas) |
| `sensitive` | 3 req/min | profile/export, profile/delete, guest/delete-request |

> Rate limiting depende do Upstash Redis. Sem configuracao, todos os requests passam — ver [task 014](../tasks-back-end/014-task-rate-limit-fallback.md).
