# Design — admin-barber-services

Referencia: `.kiro/specs/admin-barber-services/requirements.md` (R1-R10).

## Objetivos arquiteturais

- Manter a logica de filtragem ja existente em `src/services/booking.ts` (`isServiceAvailableForBarber`, `getServices(barberId)`) como unico ponto de verdade no runtime.
- Centralizar a manipulacao de `BarberService` em um service layer dedicado (`src/services/admin/barber-services.ts`) para evitar duplicacao entre as duas rotas admin (por barbeiro e por servico).
- Evitar quebra do booking em producao: introduzir feature flag `barber_services_enforced` e seed de bootstrap.
- Reutilizar padroes existentes (`requireAdmin`, `requireValidOrigin`, `apiSuccess`, `apiError`, `handlePrismaError`, `z.safeParse`).

## Arquitetura em camadas

```
UI admin (matriz + detalhes)
        |
        v
Hooks react-query (useAdminBarberServices*)
        |
        v
Rotas Next `/api/admin/barbers/[id]/services` + `/api/admin/services/[id]/barbers`
        |
        v
Service layer `src/services/admin/barber-services.ts`
        |
        v
Prisma (`BarberService`, `AdminAuditLog`, `FeatureFlag`)
        |
        v
Booking (`src/services/booking.ts` via isServiceAvailableForBarber com flag)
```

## Schema Prisma

### Estado atual

```prisma
model BarberService {
  barberId  String @map("barber_id")
  serviceId String @map("service_id")
  barber    Barber  @relation(fields: [barberId], references: [id], onDelete: Cascade)
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  @@id([barberId, serviceId])
  @@map("barber_services")
}
```

### Mudancas necessarias (MVP)

1. Nova tabela de auditoria admin (usada por esta e futuras features que precisem de trilha).

```prisma
model AdminAuditLog {
  id         String   @id @default(uuid())
  actorId    String   @map("actor_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String?  @map("entity_id")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([actorId, createdAt])
  @@index([entityType, entityId])
  @@map("admin_audit_logs")
}
```

2. Aproveitar `FeatureFlag` (ja existente) e garantir seed da chave `barber_services_enforced` com default `false`.

### Overrides (R5) — fora do MVP

Se aprovado em follow-up, adicionar em `BarberService`:

```prisma
priceOverride    Decimal? @db.Decimal(10, 2) @map("price_override")
durationOverride Int?                        @map("duration_override")
```

E expor em UI. Fica registrado mas nao entra nas tasks abaixo.

## Feature flag `barber_services_enforced`

- Seed em `prisma/seed.ts` (ou na migracao SQL de bootstrap): `upsert` em `FeatureFlag` com `enabled=false`, `description` explicando o comportamento.
- Leitura cacheada via helper existente de feature flags (verificar `src/services/feature-flags.ts`; se nao existir, criar com `unstable_cache` + `revalidateTag`).
- `isServiceAvailableForBarber` recebe um booleano `enforced` e retorna `true` quando `enforced === false` e a lista de `barbers` ainda nao foi populada para aquele servico.

Pseudocodigo da mudanca:

```ts
function isServiceAvailableForBarber(
  service: { active?: boolean; barbers?: Array<{ barberId: string }> } | null,
  barberId: string,
  enforced: boolean,
): boolean {
  if (!service || service.active === false) return false;
  const barbers = service.barbers ?? [];
  if (!enforced && barbers.length === 0) return true; // retrocompat
  return barbers.some((b) => b.barberId === barberId);
}
```

O `enforced` e lido do cache da feature flag no carregamento do contexto (`loadBookingAvailabilityContext`) e propagado para todas as chamadas downstream.

## Service layer — `src/services/admin/barber-services.ts`

API pretendida (nomes sao tentativos, design define):

```ts
export async function listBarberServiceMatrix(): Promise<MatrixRow[]>;
export async function listServicesForBarber(barberId: string): Promise<AdminBarberServiceSummary[]>;
export async function listBarbersForService(serviceId: string): Promise<AdminBarberServiceSummary[]>;
export async function setServicesForBarber(input: {
  barberId: string;
  serviceIds: string[];
  actorId: string;
}): Promise<{ added: string[]; removed: string[] }>;
export async function setBarbersForService(input: {
  serviceId: string;
  barberIds: string[];
  actorId: string;
}): Promise<{ added: string[]; removed: string[] }>;
export async function bootstrapBarberServices(options: { onlyIfEmpty: boolean }): Promise<{ inserted: number }>;
```

- Todas as operacoes de diff devem:
  1. Calcular `toAdd` e `toRemove` a partir do estado atual.
  2. Rodar `prisma.$transaction([deleteMany, createMany, auditLogMany])`.
  3. Invalidar caches (`revalidateTag("public-services")`, etc.).
  4. Detectar agendamentos `CONFIRMED` futuros que usam pares que serao removidos e lancar erro `HAS_FUTURE_APPOINTMENTS` com payload `{ pairs: Array<{barberId, serviceId, appointmentCount}> }` caso `force=false` no input.

## Rotas API

### `GET /api/admin/barbers/[id]/services`
- Auth: `requireAdmin`.
- Retorno: `{ barberId, services: Array<{ serviceId, name, active, associated: boolean }> }`.

### `PUT /api/admin/barbers/[id]/services`
- Auth: `requireAdmin`.
- CSRF: `requireValidOrigin`.
- Body Zod: `{ serviceIds: string[]; force?: boolean }`.
- Chama `setServicesForBarber`.
- Responde 409 com `HAS_FUTURE_APPOINTMENTS` quando aplicavel.

### `GET /api/admin/services/[id]/barbers`
- Espelha o padrao anterior.

### `PUT /api/admin/services/[id]/barbers`
- Espelha o padrao anterior.

### `GET /api/admin/barbers-services/matrix`
- Retorna a visao consolidada para a UI de matriz.
- Inclui `enforced: boolean` lido da feature flag para a UI mostrar um badge de estado.

### `POST /api/admin/barbers-services/bootstrap`
- Auth: `requireAdmin`.
- Dispara `bootstrapBarberServices({ onlyIfEmpty: true })` manualmente (uso unico, caso o seed nao tenha rodado).
- Retorna `{ inserted: number, skipped: boolean }`.

## UI

### Pagina matriz

Rota: `src/app/[locale]/(protected)/admin/barbearia/barbeiros-servicos/page.tsx` + `MatrixPageClient.tsx`.

Componente principal: tabela com:
- linhas = barbeiros (nome, avatar, badge "Inativo" quando aplicavel).
- colunas = servicos (nome, badge "Inativo"/ "Sem barbeiros").
- celulas = `Checkbox` do shadcn/ui, com estado `idle | saving | error`.
- rodape: botao "Salvar alteracoes" (confirmacao explicita) + botao "Descartar".
- header: toggle da feature flag com aviso "Ao ativar, pares nao associados deixam de ser agendaveis".
- filtro: busca por nome de barbeiro e servico.

### Paginas por barbeiro / por servico

- `src/app/[locale]/(protected)/admin/barbeiros/[id]/servicos/page.tsx` (+ client).
- `src/app/[locale]/(protected)/admin/barbearia/servicos/[id]/barbeiros/page.tsx` (+ client).
- Formato: lista com checkboxes + busca + salvar/cancelar. Reutiliza os mesmos hooks/components da matriz quando possivel.

### Hooks

- `src/hooks/useAdminBarberServicesMatrix.ts`
- `src/hooks/useAdminBarberServices.ts` (por barbeiro)
- `src/hooks/useAdminServiceBarbers.ts` (por servico)
- `src/hooks/useBarberServicesEnforcementFlag.ts`

Padrao: `useQuery` + `useMutation` do TanStack Query (ja usado em `useAdminBarbers`).

## Integracao com booking

### `src/services/booking.ts`

Mudancas minimas necessarias (nao reescrita):

1. `loadBookingAvailabilityContext` le `barber_services_enforced` uma vez por request (cached) e propaga em `isServiceAvailableForBarber`.
2. `getServices(barberId)` passa a usar `where` condicional:
   ```ts
   const where = barberId
     ? enforced
       ? { active: true, barbers: { some: { barberId } } }
       : { active: true, OR: [ { barbers: { some: { barberId } } }, { barbers: { none: {} } } ] }
     : { active: true };
   ```
   Ou seja: enquanto a flag esta OFF, um servico sem NENHUM barbeiro associado e considerado universal (fallback retrocompat).
3. Invalidacao de cache: service layer admin deve chamar `revalidateTag("public-services")` (o `unstable_cache` atual da linha ~2220 usa chave `["public-services"]`; tag compativel).

### UI publica de booking

- `BarberSelector` e `ChatBarberSelector` consomem um endpoint ja existente (ou novo) que lista barbeiros filtrados opcionalmente por `serviceId`. Se nao existir, criar `GET /api/booking/barbers?serviceId=...` seguindo o padrao de `getActiveBarbers`.
- `ServiceSelector` e `ChatServiceSelector` ja consomem `getServices(barberId)` via endpoint existente — nada muda se o caller passa `barberId`.

## Auditoria

- Toda operacao de adicao/remocao de `BarberService` via rotas admin escreve em `AdminAuditLog` com `action` padronizada:
  - `BARBER_SERVICE_ADDED`
  - `BARBER_SERVICE_REMOVED`
  - `BARBER_SERVICES_ENFORCEMENT_ENABLED` / `..._DISABLED`
- `metadata`: `{ barberId, serviceId }` ou `{ enabled: boolean }`.
- Nao expor `AdminAuditLog` fora do admin no MVP.

## Soft / hard delete

- `Barber` hard delete (rota existente) ja remove `barberService` via `prisma.barberService.deleteMany`. Confirmado em `src/app/api/admin/barbers/[id]/route.ts`.
- `Service` soft delete: nao apaga associacoes; filtros publicos ja usam `active: true`.
- Novos endpoints admin nao precisam de ajuste adicional.

## Riscos e decisoes

- Decisao: bootstrap por seed + flag, **nao** migracao imperativa, para permitir rollback sem perda de dados.
- Decisao: manter `BarberService` sem overrides no MVP para reduzir escopo. Registrar R5 como follow-up.
- Risco: cache de `getServices` tem TTL de 300s. Mitigado com `revalidateTag` nas mutations admin.
- Risco: concorrencia entre duas sessoes admin editando a matriz. Mitigado com "last write wins" + audit log.

## Traceability matrix

| Requisito | Onde e implementado |
|-----------|---------------------|
| R1.1-R1.4 | Pagina matriz + rota `GET /api/admin/barbers-services/matrix` + `PUT` por barbeiro/servico |
| R2.1-R2.3 | Pagina por barbeiro + `setServicesForBarber` com transacao |
| R3.1-R3.3 | Pagina por servico + `setBarbersForService` |
| R4.1 | `bootstrapBarberServices` + seed Prisma |
| R4.2-R4.3 | Feature flag `barber_services_enforced` + ajuste em `isServiceAvailableForBarber` |
| R4.4-R4.5 | Hook na criacao de Barber/Service no service layer existente |
| R5 | Registrado como opcional; nao implementado no MVP |
| R6.1-R6.3 | Ja coberto por `isServiceAvailableForBarber`; validacao de agendamentos futuros no admin service |
| R7.1-R7.3 | `getServices(barberId)` ajustado + endpoint de barbeiros filtrado |
| R8.1-R8.2 | `AdminAuditLog` + service layer escreve em cada mutation |
| R9.1-R9.4 | Consistencia com rotas existentes e `active` filter |
| R10.1-R10.2 | i18n em `pt-BR` e `en`, labels aria na matriz |
