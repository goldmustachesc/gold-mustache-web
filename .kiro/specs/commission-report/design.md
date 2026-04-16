# Design — Commission Report

## Visão Geral

Feature financeira read-only que calcula split barbeiro/casa a partir de appointments `COMPLETED`. Estende `Barber` com `commissionRate`, adiciona snapshot em `Appointment` para integridade histórica, cria um novo serviço `src/services/financial/commission.ts`, duas rotas novas (GET consolidada/por barbeiro e PATCH rate), uma aba "Comissões" em `/admin/faturamento`, e reutiliza o gerador de PDF existente. Não tem nenhuma integração externa.

## Decisão-Chave: Snapshot vs Tabela Versionada

Três alternativas avaliadas:

| Opção | Prós | Contras |
|---|---|---|
| A. Snapshot em `Appointment.commissionRateSnapshot` | Query trivial (apenas `select commissionRateSnapshot`). Integridade histórica garantida. Uma única tabela tocada na transição `COMPLETED`. | Duplica dado por appointment. |
| B. Tabela `BarberCommission` com `validFrom/validTo` por barbeiro | Sem duplicação. Auditoria natural. | Lookup por data em cada appointment (`WHERE validFrom <= apt.date AND (validTo IS NULL OR validTo > apt.date)`). Mais complexo, sensível a gaps/overlaps. |
| C. Híbrido (snapshot + tabela versionada de histórico) | Cobertura total. | Overhead sem ganho real para este escopo. |

**Decisão:** Opção A (snapshot). Justificativa:

1. Read-heavy: relatórios rodam ordens de magnitude mais do que edições de rate.
2. Evita bugs sutis de lookup por data (timezone, borda de dia).
3. Já temos o padrão de snapshot em uso no projeto (ex.: `price` no momento da reserva).
4. A auditoria separada (`BarberCommissionAudit`) preserva o histórico de alterações do valor configurado.

Consequência: a transição para `COMPLETED` DEVE gravar o snapshot. Backfill one-shot na migration usa `barber.commissionRate` atual.

## Arquitetura

```
src/
  config/
    feature-flags.ts                             # + commissionReport
  types/
    commission.ts                                # types dedicados
  lib/
    commission/
      calculate.ts                               # puro, testável, sem I/O
    pdf/
      commission-report.ts                       # reaproveita layout do financial-report.ts
    csv/
      commission-report.ts                       # gerador CSV (novo util csv)
  services/
    financial/
      commission.ts                              # orquestra queries + calculate
      __tests__/commission.test.ts
      __tests__/commission.contract.test.ts
  app/api/admin/
    financial/commission/route.ts                # GET (JSON|PDF|CSV)
    barbers/[id]/commission/route.ts             # PATCH rate
    barbers/[id]/commission/history/route.ts     # GET auditoria
  app/[locale]/(protected)/admin/
    faturamento/
      page.tsx                                   # + aba Comissões
    barbeiros/[id]/
      commission-settings.tsx                    # form de rate
  components/financial/
    CommissionTab.tsx                            # UI principal
    CommissionTable.tsx                          # tabela por barbeiro
    CommissionSummaryCards.tsx                   # totais consolidados
```

## Schema Prisma (Migration)

```prisma
model Barber {
  // campos existentes…
  commissionRate Decimal @default(0.5) @db.Decimal(5, 4) @map("commission_rate")

  commissionAudits BarberCommissionAudit[]
}

model Appointment {
  // campos existentes…
  commissionRateSnapshot Decimal? @db.Decimal(5, 4) @map("commission_rate_snapshot")

  @@index([barberId, status, date])
}

model BarberCommissionAudit {
  id            String   @id @default(uuid())
  barberId      String   @map("barber_id")
  actorId       String   @map("actor_id") // userId do admin
  previousRate  Decimal  @db.Decimal(5, 4) @map("previous_rate")
  newRate       Decimal  @db.Decimal(5, 4) @map("new_rate")
  reason        String?
  changedAt     DateTime @default(now()) @map("changed_at")

  barber Barber @relation(fields: [barberId], references: [id], onDelete: Cascade)

  @@index([barberId, changedAt])
  @@map("barber_commission_audits")
}

model BarbershopSettings {
  // campos existentes…
  defaultCommissionRate Decimal @default(0.5) @db.Decimal(5, 4) @map("default_commission_rate")
}
```

Migration SQL plan (numa só transação):
1. `ALTER TABLE barbers ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.5000;`
2. `ALTER TABLE appointments ADD COLUMN commission_rate_snapshot DECIMAL(5,4);`
3. `UPDATE appointments SET commission_rate_snapshot = b.commission_rate FROM barbers b WHERE appointments.barber_id = b.id AND appointments.status = 'COMPLETED';`
4. `CREATE TABLE barber_commission_audits (...);`
5. `ALTER TABLE barbershop_settings ADD COLUMN default_commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.5000;`

## Tipagem Pública

```ts
// src/types/commission.ts
import type { Decimal } from "@prisma/client/runtime/library";

export type CommissionPeriod =
  | { kind: "month"; year: number; month: number }  // 1..12
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 };

export interface CommissionBarberReport {
  barberId: string;
  barberName: string;
  period: CommissionPeriod;
  gross: Decimal;
  commissionAmount: Decimal;
  houseAmount: Decimal;
  appointmentCount: number;
  effectiveRateWeighted: Decimal | null; // média ponderada quando há múltiplos rates no período
}

export interface CommissionConsolidatedReport {
  period: CommissionPeriod;
  totals: {
    gross: Decimal;
    commissionAmount: Decimal;
    houseAmount: Decimal;
    appointmentCount: number;
  };
  barbers: CommissionBarberReport[];
}
```

Serialização JSON: `Decimal` → string (`"123.45"`), nunca número (evita perda de precisão). Util compartilhado `serializeDecimal(value): string`.

## Lógica de Cálculo (pure function)

`src/lib/commission/calculate.ts`:

```ts
export interface AppointmentRow {
  servicePrice: Decimal;           // apt.service.price
  commissionRateSnapshot: Decimal; // apt.commissionRateSnapshot (obrigatório em COMPLETED pós-migration)
}

export function computeCommission(rows: AppointmentRow[]): {
  gross: Decimal;
  commissionAmount: Decimal;
  houseAmount: Decimal;
} {
  // soma servicePrice -> gross
  // para cada row: commissionAmount += servicePrice * rateSnapshot
  // houseAmount = gross - commissionAmount
}
```

Zero I/O. 100% testável. Arredondamento final em 2 casas apenas na serialização (cálculo intermediário em precisão total do `Decimal`).

## Camada de Serviço

`src/services/financial/commission.ts`:

- `getBarberCommissionReport(barberId, period): Promise<CommissionBarberReport>`
- `getConsolidatedCommissionReport(period, orderBy?): Promise<CommissionConsolidatedReport>`
- `updateBarberCommissionRate(barberId, newRate, actorId, reason?): Promise<void>` (transação: update barber + insert audit)
- `getBarberCommissionHistory(barberId, pagination): Promise<{ items: AuditEntry[]; total: number }>`
- `captureCommissionSnapshot(appointmentId): Promise<void>` (chamado quando appointment transiciona para `COMPLETED`)

Todas as funções recebem `period` já validado e resolvem range de datas em `America/Sao_Paulo` via helper `resolvePeriodRange(period): { startDate: Date; endDate: Date }`.

Query base:
```ts
await prisma.appointment.findMany({
  where: {
    barberId,
    status: "COMPLETED",
    date: { gte: startDate, lte: endDate },
  },
  select: {
    commissionRateSnapshot: true,
    service: { select: { price: true } },
  },
});
```

## Integração com Transição COMPLETED

Hook único em `src/services/booking.ts` (ou endpoint admin de status) que já faz `status = COMPLETED` passa a invocar `captureCommissionSnapshot(appointmentId)` na mesma transação (via `prisma.$transaction`). Idempotente: se já existe snapshot, não sobrescreve (defensivo).

## Endpoints

### GET `/api/admin/financial/commission`

Query params (Zod):
- `month?: string` — `AAAA-MM`
- `quarter?: string` — `AAAA-Q[1-4]`
- `barberId?: string` (uuid)
- `format?: "json" | "pdf" | "csv"` (default `json`)
- `orderBy?: "name" | "gross" | "commission"` (default `gross`)

Regras:
- Exige `ADMIN`.
- Mutualmente exclusivos: `month` e `quarter`.
- Sem `barberId` → consolidado; com `barberId` → por barbeiro.
- `commissionReport` flag OFF → 404.

Response:
- JSON: `apiSuccess(report)`.
- PDF: `application/pdf` (buffer de `generateCommissionPDF`).
- CSV: `text/csv; charset=utf-8` com BOM, separador `;`.

### PATCH `/api/admin/barbers/[id]/commission`

Body (Zod):
```ts
z.object({
  rate: z.number().min(0).max(100),  // UI envia em %; server converte para fração
  reason: z.string().trim().max(500).optional(),
});
```

Exige `ADMIN`. Flag `commissionReport` ON. Cria audit entry na mesma transação.

### GET `/api/admin/barbers/[id]/commission/history`

Query: `page?: number` (default 1), `pageSize?: number` (default 20, max 100).
Response: `{ items: AuditEntry[], total, page, pageSize }`.

## UI — Aba Comissões em `/admin/faturamento`

Layout baseado no `FinancialPage.tsx` existente:

1. **Seletor de período:** reusa `MonthSelector` com toggle Mês/Trimestre.
2. **Seletor de barbeiro:** dropdown "Todos os barbeiros" (consolidado) + opções individuais.
3. **Cards topo:** Gross | Comissão Total | Líquido Casa | Atendimentos. (`CommissionSummaryCards`).
4. **Tabela:** barbeiro, atendimentos, gross, taxa (%), comissão, líquido casa. (`CommissionTable`) — sortable por coluna.
5. **Ações:** "Exportar PDF" | "Exportar CSV" (botões com `downloadBlob`).
6. **Callout:** "Apenas atendimentos concluídos. Agendamentos cancelados ou não comparecidos não entram no cálculo."

Admin → perfil do barbeiro (`/admin/barbeiros/[id]`):
- Form `CommissionSettings` com input percentual (0–100, step 0.5), textarea `reason`, botão Salvar.
- Card "Histórico de alterações" listando auditoria (quem alterou, quando, de→para, motivo).

## Reutilização de PDF

`src/lib/pdf/commission-report.ts` importa `jsPDF` e `jspdf-autotable` de forma lazy (mesmo padrão do `financial-report.ts`). Header Gold Mustache (preto + dourado), tabela consolidada + seção por barbeiro, rodapé com timestamp e paginação.

Filename: `comissao-gold-mustache-${period}.pdf`.

## Geração de CSV

Util novo `src/lib/csv/commission-report.ts`:
- BOM `\uFEFF` para UTF-8 em Excel pt-BR.
- Separador `;`.
- Escape de `"` via duplicação.
- Linhas por barbeiro + linha final `TOTAL`.

## Feature Flag

`src/config/feature-flags.ts`:
```ts
commissionReport: {
  key: "commissionReport",
  description: "Relatório de comissão por barbeiro",
  defaultValue: false,
  clientSafe: true,
  category: "financial",
},
```

Uso:
- Server: `isFeatureFlagEnabled("commissionReport")` antes dos handlers.
- Client: `useFeatureFlag("commissionReport")` para esconder aba.

## Segurança e LGPD

- RBAC: todas as rotas checam `profile.role === "ADMIN"`. Negativa → 403 (ou 404 se flag off).
- Queries com `select` mínimo (sem client/guestClient nos exports).
- PDF/CSV nunca contêm nome/email/telefone de clientes.
- Auditoria é append-only (sem rota de UPDATE/DELETE).
- Valores monetários como `Decimal`; nunca `Float`.
- Zod em todos route handlers; mensagens pt-BR.
- `any` proibido; usar `unknown` + narrowing onde aplicável.

## Observabilidade

- Logs estruturados em mutações de rate (`{ action: "commission.rate.update", barberId, actorId, previousRate, newRate }`).
- Métricas (se existir Sentry/telemetry): contador de exports PDF/CSV por mês.

## Traceability (Requisito → Componente)

| Req | Componente / Arquivo principal |
|---|---|
| 1 | `barber.commissionRate`, `PATCH /api/admin/barbers/[id]/commission`, `CommissionSettings.tsx` |
| 2 | `getBarberCommissionReport`, `GET /api/admin/financial/commission?barberId=` |
| 3 | `getConsolidatedCommissionReport`, `CommissionTable.tsx`, `CommissionSummaryCards.tsx` |
| 4 | `appointment.commissionRateSnapshot`, `captureCommissionSnapshot`, migration backfill |
| 5 | `resolvePeriodRange`, query schema com `month`/`quarter` |
| 6 | `lib/pdf/commission-report.ts`, `lib/csv/commission-report.ts`, `?format=` |
| 7 | Filtro `status: "COMPLETED"` no service + callout na UI + nota no PDF |
| 8 | `FEATURE_FLAG_REGISTRY.commissionReport`, guards nos handlers e UI |
| 9 | `BarberCommissionAudit`, `GET /api/admin/barbers/[id]/commission/history` |

## Riscos e Mitigações

- **Snapshot ausente em appointment legado:** migration faz backfill; service trata `null` como "usar `barber.commissionRate` atual" com log de warning.
- **Precisão `Decimal`:** toda aritmética usa `@prisma/client/runtime/library` `Decimal.prototype.mul/add/sub`. Sem `Number()` intermediário.
- **Performance consolidado:** índice composto `(barberId, status, date)` em `appointments` + single `findMany` com `groupBy` opcional para baixar payload.
- **Timezone:** `resolvePeriodRange` usa `America/Sao_Paulo` via `date-fns-tz` (ou equivalente já usado no projeto).
