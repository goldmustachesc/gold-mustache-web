# Design — loyalty-bugfix-audit

## Overview

Entrega em dois eixos: (A) três correções cirúrgicas em serviços de fidelidade + uma de UI (bugs R1-R4), sem novas dependências ou migrations; (B) nova infraestrutura de auditoria admin com modelo Prisma dedicado, wrapper idempotente `withAuditLog()`, mascaramento de PII e UI de consulta (R5-R6). Tudo coberto por TDD obrigatório.

## Eixo A — Correções de bugs

### A1. `markAppointmentAsNoShow` respeitando feature flag (R1)

**Diagnóstico.** `src/services/booking.ts:1600-1622` penaliza incondicionalmente. O bloco equivalente em `markAppointmentAsCompleted` (`:1721-1725`) já gateia com `isFeatureEnabled("loyaltyProgram")`. Simetria perdida.

**Correção.** Envolver o bloco existente no mesmo padrão:

```ts
if (updated.clientId && updated.client) {
  try {
    const { isFeatureEnabled } = await import("./feature-flags");
    const loyaltyEnabled = await isFeatureEnabled("loyaltyProgram");
    if (!loyaltyEnabled) return mapAppointment(updated);

    const { LoyaltyService } = await import("./loyalty/loyalty.service");
    const { calculateAppointmentPoints } = await import(
      "./loyalty/points.calculator"
    );
    // ... resto igual, penalizePoints dentro do if
  } catch (error) {
    console.error("Falha ao aplicar penalidade de pontos", error);
  }
}
```

Arquivo/linha: `src/services/booking.ts:1600-1622`. Diff mínimo — apenas duas linhas de guard no topo do try.

### A2. `getTypeIcon` mapeando todos os tipos do enum (R2)

**Diagnóstico.** `src/app/[locale]/(protected)/loyalty/history/page.tsx:22-27` compara `type === "EARNED"` e `type === "ADJUSTED_ADD"`. Ambos inexistem no `PointTransactionType_Enum` (`prisma/schema.prisma:417-428`), logo toda linha cai no branch de seta para baixo (destructive) — inclusive ganhos.

**Correção.** Lookup baseado no sinal de `points` + tabela explícita para `ADJUSTED`:

```ts
const POSITIVE_TYPES = new Set<PointTransactionType>([
  "EARNED_APPOINTMENT",
  "EARNED_REFERRAL",
  "EARNED_REVIEW",
  "EARNED_CHECKIN",
  "EARNED_BIRTHDAY",
  "EARNED_BONUS",
]);
const NEGATIVE_TYPES = new Set<PointTransactionType>([
  "REDEEMED",
  "EXPIRED",
  "PENALTY_NO_SHOW",
]);

function getTypeIcon(type: PointTransactionType, points: number) {
  if (POSITIVE_TYPES.has(type)) return <ArrowUpRight className="... text-success" />;
  if (NEGATIVE_TYPES.has(type)) return <ArrowDownRight className="... text-destructive" />;
  // ADJUSTED: depende do sinal
  return points >= 0
    ? <ArrowUpRight className="... text-success" />
    : <ArrowDownRight className="... text-destructive" />;
}
```

Label: extender `src/i18n/locales/{pt-BR,en,es}/loyalty.json > history.types` cobrindo todos os 10 valores do enum. Arquivo hoje cobre apenas 4 chaves (`EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED`). `getTypeLabel` passa a fazer lookup direto por valor do enum, sem o prefix-hack atual (`type.startsWith("ADJUSTED")`).

Arquivos: `src/app/[locale]/(protected)/loyalty/history/page.tsx:22-32`, `src/i18n/locales/pt-BR/loyalty.json:71-76` (+ en/es). Tipar `tx.type` como `PointTransactionType` (importar do `@prisma/client`) em vez de `string`.

### A3. `EARNED_CHECKIN` em `EXPIRABLE_TYPES` (R3)

**Diagnóstico.** `src/services/loyalty/expiration.service.ts:7-13` omite `EARNED_CHECKIN`. Resultado: 20 pontos/checkin acumulam eternamente, quebrando a política `POINTS_EXPIRY_MONTHS`.

**Correção.** Adicionar uma linha:

```ts
const EXPIRABLE_TYPES = [
  PointTransactionType.EARNED_APPOINTMENT,
  PointTransactionType.EARNED_REFERRAL,
  PointTransactionType.EARNED_REVIEW,
  PointTransactionType.EARNED_CHECKIN, // ← NOVO
  PointTransactionType.EARNED_BIRTHDAY,
  PointTransactionType.EARNED_BONUS,
];
```

Arquivo: `src/services/loyalty/expiration.service.ts:7`. Sem backfill obrigatório — transações existentes já possuem `expiresAt` (vide `LoyaltyService.creditPoints`), só não eram elegíveis. A partir do deploy, a próxima execução do cron expira naturalmente.

### A4. UI de referral com bônus correto (R4)

**Diagnóstico.** `src/app/[locale]/(protected)/loyalty/referral/page.tsx:79` usa `t("description", { points: LOYALTY_CONFIG.REFERRAL_BONUS })`. O copy atual do JSON (`"Compartilhe seu código com amigos e ambos ganham {points} pontos."`) informa o mesmo valor para ambos, inconsistente com `ReferralService.creditReferralBonus` (`src/services/loyalty/referral.service.ts:92-132`) que credita 150 ao indicante e 50 ao indicado.

**Correção.**
1. Dividir a chave `description` em `bonusReferrer` e `bonusReferred` nos 3 arquivos de locale.
2. Na page, trocar por dois parágrafos/linhas:
   ```tsx
   <p>{t("bonusReferrer", { points: LOYALTY_CONFIG.REFERRAL_BONUS })}</p>
   <p>{t("bonusReferred", { points: LOYALTY_CONFIG.FIRST_APPOINTMENT_BONUS })}</p>
   ```
3. Ajustar a mensagem de confirmação (após `applyReferral.isSuccess`) para mencionar `FIRST_APPOINTMENT_BONUS`.

Arquivos: `src/app/[locale]/(protected)/loyalty/referral/page.tsx:78-81`, `src/i18n/locales/{pt-BR,en,es}/loyalty.json > referral`.

## Eixo B — Audit Log admin estruturado

### B1. Modelo Prisma `AdminAuditLog`

Novo modelo em `prisma/schema.prisma`:

```prisma
model AdminAuditLog {
  id           String           @id @default(uuid())
  actorId      String           @map("actor_id")
  action       AdminAuditAction
  resourceType String           @map("resource_type")
  resourceId   String?          @map("resource_id")
  payload      Json
  ip           String?
  userAgent    String?          @map("user_agent")
  createdAt    DateTime         @default(now()) @map("created_at")

  actor        Profile          @relation(fields: [actorId], references: [id])

  @@index([actorId, createdAt])
  @@index([action, createdAt])
  @@index([resourceType, resourceId])
  @@map("admin_audit_logs")
}

enum AdminAuditAction {
  REWARD_CREATE
  REWARD_UPDATE
  REWARD_DELETE
  REWARD_TOGGLE
  LOYALTY_POINTS_ADJUST
  LOYALTY_EXPIRE_MANUAL
  LOYALTY_BIRTHDAY_MANUAL
  FEATURE_FLAG_UPDATE
  SERVICE_CREATE
  SERVICE_UPDATE
  SERVICE_DELETE
  BARBER_CREATE
  BARBER_UPDATE
  BARBER_DELETE
  SHOP_HOURS_UPDATE
  SHOP_CLOSURE_CREATE
  SHOP_CLOSURE_DELETE
  FEEDBACK_MODERATE
  CLIENT_BAN
  CLIENT_UNBAN
  APPOINTMENT_FORCE_UPDATE
}
```

Os três índices cobrem os filtros definidos em R6.3. Relação com `Profile` permite `include: { actor: { select: { fullName: true } } }` na UI.

Migration: `pnpm prisma migrate dev --name add_admin_audit_log`.

### B2. Serviço `AdminAuditService`

Novo arquivo `src/services/admin-audit.service.ts`:

```ts
const PII_KEYS = new Set([
  "phone", "email", "document", "cpf", "cnpj", "rg",
  "zipCode", "birthDate", "password", "passwordHash", "token",
]);

function maskPII<T>(value: T): T {
  // deep clone + walk; substitui valor por "[REDACTED]" quando key ∈ PII_KEYS
}

function maskIp(raw: string | null): string | null {
  // "1.2.3.4" → "1.2.***.***"; "::1" → "::1"
}

export interface AuditParams {
  actorId: string;
  action: AdminAuditAction;
  resourceType: string;
  resourceId?: string | null;
  payload: Prisma.InputJsonValue;
  request?: Request; // extrai ip/userAgent dos headers
}

export const AdminAuditService = {
  async log(params: AuditParams): Promise<void> {
    try {
      const ip = params.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const userAgent = params.request?.headers.get("user-agent") ?? null;
      await prisma.adminAuditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId ?? null,
          payload: maskPII(params.payload),
          ip,
          userAgent,
        },
      });
    } catch (error) {
      console.error("[AdminAudit] failed to persist log", error);
    }
  },
  list, // paginado com filtros — ver B4
};
```

Funções puras (`maskPII`, `maskIp`) ficam em `src/services/admin-audit.utils.ts` para unit test isolado.

### B3. Wrapper `withAuditLog()` para route handlers

Novo `src/app/api/admin/_audit/withAuditLog.ts`:

```ts
type RouteHandler = (request: Request, ctx: unknown) => Promise<Response>;

interface AuditConfig<T> {
  action: AdminAuditAction;
  resourceType: string;
  extractResourceId?: (result: T, request: Request) => string | null;
  extractPayload?: (result: T, request: Request) => Prisma.InputJsonValue;
}

export function withAuditLog<T = unknown>(
  handler: RouteHandler,
  config: AuditConfig<T>,
): RouteHandler {
  return async (request, ctx) => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const response = await handler(request, ctx);
    const cloned = response.clone();
    if (cloned.status >= 200 && cloned.status < 300) {
      let body: T | undefined;
      try { body = (await cloned.json()) as T; } catch { /* não-JSON ignora */ }
      void AdminAuditService.log({
        actorId: auth.profileId,
        action: config.action,
        resourceType: config.resourceType,
        resourceId: body ? config.extractResourceId?.(body, request) ?? null : null,
        payload: body ? config.extractPayload?.(body, request) ?? {} : {},
        request,
      });
    }
    return response;
  };
}
```

Fire-and-forget com `void` mantém latência da resposta original. Erro do audit não bloqueia (R5.4).

Aplicação inicial (desta spec):
- `src/app/api/admin/loyalty/rewards/route.ts` → `REWARD_CREATE`
- `src/app/api/admin/loyalty/rewards/[id]/route.ts` → `REWARD_UPDATE` (PATCH), `REWARD_DELETE` (DELETE)
- `src/app/api/admin/loyalty/rewards/[id]/toggle/route.ts` → `REWARD_TOGGLE`

Ações em outras áreas admin (barbers, services, feature-flags, etc.) ficam fora desta entrega mas o enum já está preparado; adoção incremental em specs futuras.

### B4. Listagem paginada `/api/admin/audit`

Novo `src/app/api/admin/audit/route.ts` (`GET`):

- Zod schema valida query: `page` (int ≥ 1, default 1), `pageSize` (int 1-100, default 50), `from`/`to` (ISO datetime), `adminId` (uuid), `action` (enum), `resourceType` (string).
- `AdminAuditService.list(filters)` retorna `{ items, total, page, pageSize }`.
- `items` já vem com `actor: { id, fullName }` via `include` mínimo.
- `ip` mascarado via `maskIp` antes de serializar.
- Protegido por `requireAdmin()`.

### B5. UI `/admin/auditoria`

Nova página em `src/app/[locale]/(protected)/admin/auditoria/page.tsx` (Server Component) + `AuditLogTable.tsx` (Client):

- Server: lê searchParams, consulta `AdminAuditService.list`, passa para o Client.
- Client: renderiza tabela com shadcn/ui `Table`, filtros em `FilterBar` (date range picker, select de admin, select de action, input de resourceType), paginação em `Pagination`.
- Modal "ver payload" usa `Dialog` com `<pre className="text-xs whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>`.
- Deep link: mudança de filtro atualiza URL via `router.replace(new URL(...))`.
- Empty state + loading skeleton consistentes com o padrão atual do admin.

Hook de dados: `src/hooks/useAdminAuditLogs.ts` com TanStack Query (keepPreviousData true).

### B6. Remoção dos `console.info("[AUDIT] ...")`

Os quatro pontos em `src/app/api/admin/loyalty/rewards/**` (lines 124, 177, 246 do `[id]/route.ts`, 83 do toggle) são substituídos pela persistência via wrapper. Mensagens de log passam a ser side-effect do wrapper e removidas inline para evitar duplicidade.

## Traceability

| Requisito | Componente |
|-----------|------------|
| R1.1–R1.4 | `src/services/booking.ts:1600-1622` (A1) |
| R2.1–R2.5 | `src/app/[locale]/(protected)/loyalty/history/page.tsx:22-32` + i18n (A2) |
| R3.1–R3.4 | `src/services/loyalty/expiration.service.ts:7-13` (A3) |
| R4.1–R4.5 | `src/app/[locale]/(protected)/loyalty/referral/page.tsx:78-81` + i18n (A4) |
| R5.1 | Modelo `AdminAuditLog` + `AdminAuditService.log` (B1, B2) |
| R5.2 | Extração de headers no wrapper (B3) |
| R5.3 | `maskPII` em `admin-audit.utils.ts` (B2) |
| R5.4 | Try/catch fire-and-forget no wrapper (B3) |
| R5.5 | Índices Prisma permitem consulta a qualquer janela (B1) |
| R5.6 | Gate `requireAdmin()` no wrapper (B3) |
| R5.7 | `response.clone()` só dispara após 2xx (B3) |
| R5.8 | Aplicação do wrapper em rewards remove `console.info` (B6) |
| R6.1 | `AuditLogTable` (B5) |
| R6.2 | Paginação no endpoint + hook (B4, B5) |
| R6.3 | Zod schema com filtros opcionais (B4) |
| R6.4 | Modal `Dialog` com payload mascarado (B5) |
| R6.5 | `requireAdmin()` no layout/page server (B5) |
| R6.6 | Empty state em `AuditLogTable` (B5) |
| R6.7 | `router.replace` sincroniza URL (B5) |
| R6.8 | Endpoint já retorna JSON serializável (B4) |

## Decisões

- **Sem backfill**: pontos `EARNED_CHECKIN` históricos permanecem como estão; a política de expiração vale para o futuro. Riscos de backfill (surpresa ao cliente) > benefício.
- **Audit como fire-and-forget**: evitar bloquear rotas críticas caso a tabela fique indisponível; monitoramento via `console.error` + Vercel Logs. Alternativa (queue) adiciona infra sem ganho prático hoje.
- **PII masking por denylist**: cobre casos conhecidos; lista fica centralizada em `admin-audit.utils.ts` e é testada. Evoluções (ex.: regex para CPF) ficam em spec futura.
- **Mascaramento de IP na UI**: ocultar últimos 2 octetos atende LGPD sem perder utilidade operacional. IP completo permanece no banco para investigação autorizada.
- **Retenção**: schema suporta 90 dias mínimo; cron de expurgo será spec separada (`admin-audit-retention`).
- **Enum de ações**: prefere-se enum Prisma a string livre para impedir typos e habilitar filtros type-safe. Enum é versionado junto com o código.
- **Wrapper vs middleware Next**: wrapper composto é explícito e testável por rota; middleware global em `src/middleware.ts` acoplaria demais e complicaria reuso.
- **UI com shadcn/ui**: mantém coerência visual com demais páginas admin.
