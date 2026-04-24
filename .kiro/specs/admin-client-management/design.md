# Design — Admin Client Management

## Overview

Modulo admin para gestao unificada de clientes registrados (`Profile`) e guests (`GuestClient`). Feature entrega:

- Listagem paginada com busca e filtros server-side.
- Detalhe do cliente com tabs (visao geral, agendamentos, feedbacks, fidelidade, notas internas, historico admin).
- Relatorio de inativos (30/60/90 dias).
- Export CSV LGPD-safe.
- Ban/unban e merge guest -> profile via UI.
- Audit log integrado com `loyalty-bugfix-audit`.

Principio: reutilizar o maximo de servicos existentes (`banned-client.ts`, `guest-linking.ts`), adicionar service agregador `src/services/admin/clients.ts` e DataTable generica compartilhavel.

## Arquitetura

```
app/[locale]/(protected)/admin/clientes
  page.tsx                  -> server component (ClientListPage)
  ClientListClient.tsx      -> client: filtros, DataTable
  [id]/page.tsx             -> server component (ClientDetailPage)
  [id]/ClientDetailClient.tsx -> client: tabs, edits, ban/unban
  inativos/page.tsx         -> server component (InactiveReportPage)

app/api/admin/clients
  route.ts                             -> GET listagem
  export.csv/route.ts                  -> GET export
  inactive/route.ts                    -> GET inativos
  [id]/route.ts                        -> GET detalhe, PATCH edicao
  [id]/notes/route.ts                  -> PATCH notas
  [id]/ban/route.ts                    -> POST/DELETE ban
  [id]/claim-guest/route.ts            -> POST merge

services/admin/clients.ts   -> camada agregadora + queries otimizadas
services/admin/__tests__/clients.test.ts
lib/privacy/mask.ts         -> helpers de mascaramento LGPD
lib/csv/stream.ts           -> utilitario CSV streaming (se ainda nao existir)
components/custom/admin/clients/
  ClientDataTable.tsx
  ClientFiltersPanel.tsx
  ClientDetailHeader.tsx
  ClientTabs.tsx
  BanClientDialog.tsx
  ClaimGuestDialog.tsx
  InactiveClientsReport.tsx
components/ui/data-table.tsx -> DataTable generica reutilizavel (nova)
```

## Modelo de dados

### Schema changes (`prisma/schema.prisma`)

```prisma
model Profile {
  // ...campos existentes
  adminNotes String? @map("admin_notes") @db.Text

  @@index([fullName])   // para busca/ordenacao
  @@index([phone])      // ja util, adicionar se nao existir
}

model GuestClient {
  // ...campos existentes
  adminNotes String? @map("admin_notes") @db.Text

  @@index([fullName])
}
```

Migration SQL adicional para busca textual (opcional, performance):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_fullname_trgm_idx
  ON profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS guest_clients_fullname_trgm_idx
  ON guest_clients USING gin (full_name gin_trgm_ops);
```

Nota: adicionar apenas se `EXPLAIN ANALYZE` mostrar seq scan em volumes esperados (>10k rows). Caso contrario, manter `ILIKE` + indice btree.

### Audit log

Depende do modelo `AdminAuditLog` de `loyalty-bugfix-audit`. Contrato esperado:

```prisma
model AdminAuditLog {
  id             String   @id @default(uuid())
  adminProfileId String   @map("admin_profile_id")
  action         String   // "client.notes.update", "client.profile.update", "client.ban", "client.unban", "client.export", "client.claim-guest", "client.view-sensitive"
  targetType     String   @map("target_type") // "profile" | "guest_client"
  targetId       String   @map("target_id")
  before         Json?
  after          Json?
  metadata       Json?
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([targetType, targetId])
  @@index([adminProfileId, createdAt])
}
```

Fallback (feature flag `adminAuditLog.enabled=false`): `console.info({ audit: true, ... })` em formato estruturado — implementado em `src/lib/audit/logAdminAction.ts`.

## API

### `GET /api/admin/clients`

**Query params (Zod):**
```ts
const listClientsQuery = z.object({
  q: z.string().trim().min(2).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  inactiveDays: z.coerce.number().int().refine((v) => [30, 60, 90].includes(v)).optional(),
  banned: z.coerce.boolean().optional(),
  type: z.enum(["registered", "guest"]).optional(),
  loyaltyTier: z.enum(["BRONZE", "SILVER", "GOLD", "DIAMOND"]).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.enum(["lastAppointmentAt", "fullName", "createdAt"]).default("lastAppointmentAt"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});
```

**Response:**
```ts
type ClientRow = {
  id: string;
  type: "registered" | "guest";
  fullName: string | null;
  phone: string | null;
  email: string | null;     // apenas registered
  role: UserRole | null;     // apenas registered
  loyaltyTier: LoyaltyTier | null;
  isBanned: boolean;
  totalAppointments: number;
  lastAppointmentAt: Date | null;
  createdAt: Date;
};

type ListResponse = {
  data: ClientRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
```

**Implementacao:** query unica com `UNION ALL` via `prisma.$queryRaw<ClientRow[]>` (mais performatico que duas queries + merge em memoria). Subquery lateral para `lastAppointmentAt` e `totalAppointments`. Parametros sanitizados via `Prisma.sql` template literal.

**Paginacao:** offset-based na primeira versao (mais simples). Cursor-based documentado como upgrade futuro se >50k rows.

### `GET /api/admin/clients/[id]`

**Params:** `id` (uuid). Infere tipo testando primeiro `Profile`, depois `GuestClient`.

**Query opcional:** `includeSensitive=true` — quando presente, inclui email/phone/birthDate/adminNotes e emite audit log `client.view-sensitive` com `justification` query param obrigatoria.

**Response:** objeto unificado com `basics`, `stats`, `loyalty` (null se guest), `bans` (historico), `notes`, `claimedGuests` (para profile), `claimedByProfile` (para guest claimed).

### `PATCH /api/admin/clients/[id]`

Body parcial dos campos editaveis (Requisito 4). Retorna profile atualizado. Audit log com diff.

### `PATCH /api/admin/clients/[id]/notes`

Body: `{ notes: string | null }` (max 2000 chars). Audit log com before/after.

### `POST /api/admin/clients/[id]/ban`

Body: `{ reason?: string }`. Chama `banClient` com `clientType` inferido. Para registered, precisa de `bannedBy` — solucoes:

- **Opcao A (recomendada):** adicionar coluna `BannedClient.bannedByAdminProfileId` (opcional) e tornar `bannedBy` (FK Barber) nullable numa migration. Novo indice composto.
- **Opcao B:** usar o barbeiro vinculado ao admin (se existir) como `bannedBy`. Falha se admin nao tem Barber.
- **Opcao C (temporaria):** exigir que admin selecione um barbeiro no modal.

Design adota **Opcao A**; schema change:

```prisma
model BannedClient {
  bannedBy               String?  @map("banned_by")
  bannedByAdminProfileId String?  @map("banned_by_admin_profile_id")
  barber                 Barber?  @relation(...)
  bannedByAdmin          Profile? @relation("AdminBans", fields: [bannedByAdminProfileId], references: [id])
  // constraint: CHECK (banned_by IS NOT NULL OR banned_by_admin_profile_id IS NOT NULL)
}
```

### `DELETE /api/admin/clients/[id]/ban`

Infere `bannedClientId` pelo `id` alvo (buscar `BannedClient` por `profileId` ou `guestClientId`). Audit log.

### `GET /api/admin/clients/inactive`

Query: `days (30|60|90)`, `includeBanned=false`, `format=json|csv`, `page`, `pageSize`.

Implementacao: subquery `Appointment.groupBy({ by: clientId|guestClientId, _max: { date } })` filtrando por status `CONFIRMED`/`COMPLETED` e excluindo clientes cujo `max(date) >= now - days`.

### `GET /api/admin/clients/export.csv`

Reutiliza mesmos filtros de `/api/admin/clients`. Query adicional:
- `includeSensitive=true`
- `justification` (min 10 chars)

Rate limit: `src/lib/rate-limit.ts` chave `admin-export:${profileId}`.

**Streaming:** usar `Response` com `ReadableStream`. Para cada batch (1000 rows), escreve linhas CSV. Biblioteca: implementar helper proprio em `src/lib/csv/stream.ts` — sem nova dependencia.

**Header:** `Content-Disposition: attachment; filename="clientes-${YYYY-MM-DD}.csv"`, `Content-Type: text/csv; charset=utf-8`. Prefixo BOM `\uFEFF`.

### `POST /api/admin/clients/[profileId]/claim-guest`

Body: `{ guestClientId: string }`. Transacao:

```ts
await prisma.$transaction(async (tx) => {
  const guest = await tx.guestClient.findUnique({ where: { id: guestClientId } });
  if (!guest || guest.claimedAt) throw new Error("GUEST_NOT_AVAILABLE");

  await tx.guestClient.update({
    where: { id: guestClientId },
    data: { claimedAt: new Date(), claimedByProfileId: profileId },
  });

  const { count: movedAppointments } = await tx.appointment.updateMany({
    where: { guestClientId, clientId: null },
    data: { clientId: profileId, guestClientId: null },
  });

  const { count: movedFeedbacks } = await tx.feedback.updateMany({
    where: { guestClientId, clientId: null },
    data: { clientId: profileId, guestClientId: null },
  });

  await migrateGuestBanToProfile(tx, { guestClientId, profileId });

  return { movedAppointments, movedFeedbacks };
});
```

Nota: verificar em `src/services/guest-linking.ts` se ja existe funcao equivalente e reusar.

## Service layer

### `src/services/admin/clients.ts`

Exporta:

```ts
export async function listClients(params: ListClientsParams): Promise<ListClientsResult>;
export async function getClientById(id: string): Promise<ClientDetail | null>;
export async function updateClientProfile(id: string, patch: UpdateClientInput): Promise<ClientDetail>;
export async function updateClientNotes(id: string, type: ClientType, notes: string | null): Promise<void>;
export async function listInactiveClients(params: InactiveParams): Promise<InactiveResult>;
export async function exportClientsCsv(params: ExportParams): AsyncIterable<string>;
export async function claimGuestToProfile(profileId: string, guestClientId: string): Promise<ClaimResult>;
```

Tipos em `src/types/admin-clients.ts`. Reutiliza `banClient`/`unbanClient` de `banned-client.ts` (nao duplicar).

## UI

### `/admin/clientes` — Listagem

- Server component carrega filtros iniciais da query string e chama `listClients`.
- Client component recebe `initialData` + renderiza:
  - Toolbar: campo busca (debounce), botao "Filtros" (abre drawer `ClientFiltersPanel`), botao "Exportar CSV" (abre modal de justificativa se `includeSensitive`).
  - `ClientDataTable` com colunas: nome, telefone (mascarado opcional), tipo, ultimo agendamento, total, tier, status. Row click -> `/admin/clientes/[id]`.
  - Paginador server-side com updates via `router.replace(pathname + newSearch)`.

### `/admin/clientes/[id]` — Detalhe

- `ClientDetailHeader`: avatar, nome, badges (tipo, banido, tier), acoes (Editar, Banir/Desbanir, Vincular guest).
- `ClientTabs` (shadcn `Tabs`):
  - Visao geral: cards de stats.
  - Agendamentos: tabela paginada (`/api/admin/clientes/[id]/appointments?page=...`).
  - Feedbacks: lista com rating.
  - Fidelidade: saldo + transacoes recentes + link para `/admin/loyalty/accounts/[id]`.
  - Notas internas: `Textarea` + botao salvar com debounce.
  - Historico admin: tabela somente leitura do audit log.
- `BanClientDialog`: modal com `reason` (obrigatoria, min 10 chars). Confirma -> POST ban.
- `ClaimGuestDialog`: modal confirmacao com resumo de impacto.

### `/admin/clientes/inativos`

- Tabs para 30/60/90 dias.
- Tabela com: nome, telefone, dias desde ultimo, total lifetime, acoes (ver detalhe, exportar CSV filtrado).

## Componente DataTable generica

`src/components/ui/data-table.tsx` (nova). API:

```ts
type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange?: (orderBy: string, dir: "asc" | "desc") => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  ariaLabel: string;
};
```

Sem dependencias externas (sem TanStack Table nesta versao — YAGNI). Pode ser migrada depois. Responsiva (scroll horizontal em mobile com sticky first column).

## Mascaramento LGPD

`src/lib/privacy/mask.ts`:

```ts
export function maskEmail(email: string): string;       // j***@gmail.com
export function maskPhone(phone: string): string;       // (**) *****-1234
export function maskCpf(cpf: string): string;           // 123***-**89
export function maskName(name: string, keep = 2): string;
export function redactObject<T>(obj: T, paths: string[]): T;
```

Usado em:
- `handlePrismaError` extensions (evitar logar dados sensiveis).
- Audit log `before`/`after` — mascarar ao gravar.
- `console.log`/`logger` em rotas.

## Performance

- Listagem: target P95 < 400ms para 20k clientes. Validar com `EXPLAIN ANALYZE`.
- Export 5000 rows via streaming: < 3s.
- Detalhe: paralelizar queries (`Promise.all` em service) — basics, counts, loyalty, lastAppointment.

## i18n

Arquivo `messages/pt-BR.json` namespace:

```json
{
  "admin": {
    "clients": {
      "title": "Clientes",
      "search.placeholder": "Buscar por nome, telefone ou email",
      "filters.title": "Filtros",
      "filters.status.active": "Ativos",
      "filters.status.inactive": "Inativos",
      "table.columns.name": "Nome",
      "table.columns.phone": "Telefone",
      "table.columns.lastAppointment": "Ultimo agendamento",
      "detail.tabs.overview": "Visao geral",
      "detail.tabs.appointments": "Agendamentos",
      "detail.tabs.feedbacks": "Feedbacks",
      "detail.tabs.loyalty": "Fidelidade",
      "detail.tabs.notes": "Notas internas",
      "detail.tabs.audit": "Historico admin",
      "ban.confirmTitle": "Banir cliente?",
      "export.justificationLabel": "Justificativa (LGPD)",
      "inactive.30days": "Sem agendar ha 30+ dias",
      "inactive.60days": "Sem agendar ha 60+ dias",
      "inactive.90days": "Sem agendar ha 90+ dias"
    }
  }
}
```

Espelhar em `en.json` e `es.json`.

## Erros e observabilidade

- Codigos: `CLIENT_NOT_FOUND`, `CLIENT_ALREADY_BANNED`, `BAN_NOT_FOUND`, `GUEST_NOT_AVAILABLE`, `EXPORT_RATE_LIMIT`, `INVALID_JUSTIFICATION`, `VALIDATION_ERROR`, `FORBIDDEN`, `UNAUTHORIZED`.
- Uso de `handlePrismaError` e `apiError`/`apiSuccess` existentes.
- Metricas (futuro): count por acao admin, export size, duration.

## Traceability

| Requisito | Componentes / rotas |
| --- | --- |
| 1 Listagem | `GET /clients`, `listClients`, `ClientDataTable` |
| 2 Filtros | `listClientsQuery` Zod, `ClientFiltersPanel` |
| 3 Detalhe | `GET /clients/[id]`, `ClientTabs`, `ClientDetailClient` |
| 4 Edicao | `PATCH /clients/[id]`, `updateClientProfile`, audit log |
| 5 Inativos | `GET /clients/inactive`, `InactiveClientsReport` |
| 6 Export | `GET /clients/export.csv`, `exportClientsCsv`, `lib/csv/stream.ts` |
| 7 Ban/Unban | `POST|DELETE /clients/[id]/ban`, `BanClientDialog`, reuso `banned-client.ts` |
| 8 Audit log | `logAdminAction`, integracao `loyalty-bugfix-audit` |
| 9 Guest lookup | busca telefone normalizada em `listClients` |
| 10 Merge guest | `POST /clients/[profileId]/claim-guest`, `claimGuestToProfile` |
| 11 Performance | indices Prisma + migration opcional pg_trgm |
| 12 i18n/a11y | `messages/*.json`, DataTable com ARIA |
| 13 Seguranca | `requireAdmin`, `requireValidOrigin`, `mask.ts`, Zod |

## Riscos e mitigacoes

- **Audit log dependency:** `loyalty-bugfix-audit` pode nao estar pronto. Mitigacao: feature flag + fallback console estruturado.
- **Schema changes em `BannedClient`:** migration precisa ser revisada (tornar `bannedBy` nullable pode afetar codigo existente). Mitigacao: manter `bannedBy` not null para bans de barbeiro; adicionar `bannedByAdminProfileId` opcional e CHECK constraint.
- **Performance de UNION ALL com busca ILIKE:** validar com dataset de staging. Fallback: duas queries + merge em memoria com cap de 500 rows por tipo.
- **Export CSV grande:** rate limit + cap em 5000 rows por export. Documentar na UI.
