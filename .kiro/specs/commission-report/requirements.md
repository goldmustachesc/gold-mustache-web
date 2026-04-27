# Documento de Requisitos — Commission Report

## Introdução

Esta feature entrega um relatório financeiro com split de comissão entre barbeiro e casa para a Gold Mustache. Permite que administradores definam um percentual de comissão por barbeiro (configurável por perfil), calculem receita a partir de `Appointment` com status `COMPLETED`, gerem relatórios mensais por barbeiro e consolidados, exportem em PDF e CSV, e mantenham histórico fiel ao rate vigente no momento do atendimento. Não há integração com gateway de pagamento — escopo é apenas projeção, tracking e relatório de receita/comissão.

## Glossário

- **Gross (bruto):** soma de `service.price` dos appointments `COMPLETED` no período.
- **Comissão do barbeiro:** `gross * commissionRateSnapshot`.
- **Líquido casa:** `gross - comissão do barbeiro`.
- **Rate vigente:** percentual efetivo no momento em que o appointment foi marcado como `COMPLETED`, armazenado como snapshot no appointment.
- **Período:** intervalo fechado por mês (AAAA-MM) ou trimestre (AAAA-Q1..Q4).

## Requisitos

### Requisito 1 — Cadastro de Percentual de Comissão por Barbeiro

**User Story:** Como administrador, quero definir o percentual de comissão de cada barbeiro, para que o cálculo do relatório reflita o acordo comercial vigente.

#### Critérios de Aceitação

1. QUANDO o admin acessa o perfil de um barbeiro na área admin, ENTÃO o sistema DEVE exibir o campo `commissionRate` em percentual (0–100%).
2. QUANDO o admin salva um valor fora do intervalo [0, 100] ou não numérico, ENTÃO o sistema DEVE rejeitar com erro de validação (Zod) e mensagem em pt-BR.
3. QUANDO o admin salva um novo valor válido, ENTÃO o sistema DEVE persistir como `Decimal(5, 4)` (ex.: 0.5000 para 50%) e registrar auditoria (`actorId`, `previousRate`, `newRate`, `changedAt`).
4. QUANDO um barbeiro é criado sem `commissionRate` informado, ENTÃO o sistema DEVE aplicar o default configurável em `BarbershopSettings.defaultCommissionRate` (fallback 0.5 = 50%).
5. QUANDO o usuário autenticado não tiver role `ADMIN`, ENTÃO o endpoint `PATCH /api/admin/barbers/[id]/commission` DEVE retornar 403.

### Requisito 2 — Relatório Mensal por Barbeiro

**User Story:** Como administrador, quero ver um relatório mensal individual por barbeiro, para entender quanto cada profissional faturou e qual a comissão devida.

#### Critérios de Aceitação

1. QUANDO o admin solicita `GET /api/admin/financial/commission?month=2026-04&barberId=<uuid>`, ENTÃO o sistema DEVE retornar `{ barberId, barberName, period, gross, commissionAmount, houseAmount, appointmentCount, breakdown[] }`.
2. O cálculo DEVE considerar SOMENTE appointments com status `COMPLETED` no período.
3. O cálculo DEVE multiplicar `service.price` por `commissionRateSnapshot` de cada appointment (não o rate atual do barbeiro).
4. QUANDO não houver appointments `COMPLETED` no período, ENTÃO o sistema DEVE retornar `gross=0`, `commissionAmount=0`, `houseAmount=0`, `appointmentCount=0` e `breakdown=[]` (nunca erro).
5. Os valores monetários DEVEM usar `Decimal` (prisma) e serem serializados como string decimal em pt-BR (ex.: "1234.56") para evitar perda de precisão via `Float`.

### Requisito 3 — Relatório Consolidado (Todos os Barbeiros)

**User Story:** Como administrador, quero um relatório consolidado mensal com todos os barbeiros, para comparar performance e calcular o total da casa.

#### Critérios de Aceitação

1. QUANDO o admin solicita `GET /api/admin/financial/commission?month=2026-04` (sem `barberId`), ENTÃO o sistema DEVE retornar `{ period, totals: { gross, commissionAmount, houseAmount, appointmentCount }, barbers: [{ ...porBarbeiro }] }`.
2. A lista DEVE incluir TODOS os barbeiros ativos no período, mesmo com `gross=0`.
3. A ordenação default DEVE ser por `gross` decrescente; param `?orderBy=name|gross|commission` DEVE permitir alternar.
4. Os totais DEVEM ser a soma exata dos valores por barbeiro (sem arredondamento intermediário).

### Requisito 4 — Histórico de Rate (Snapshot no Appointment)

**User Story:** Como administrador, quero que relatórios retroativos reflitam o rate que vigorava no momento do atendimento, para que uma alteração hoje não distorça meses anteriores.

#### Critérios de Aceitação

1. QUANDO um appointment transiciona para `COMPLETED`, ENTÃO o sistema DEVE gravar `commissionRateSnapshot` = `barber.commissionRate` atual no próprio registro `Appointment`.
2. QUANDO o admin altera o `commissionRate` de um barbeiro, ENTÃO o sistema NÃO DEVE alterar snapshots de appointments já `COMPLETED`.
3. QUANDO um appointment `COMPLETED` é consultado, ENTÃO o relatório DEVE usar `commissionRateSnapshot` do registro, nunca o valor atual do barbeiro.
4. Para appointments `COMPLETED` antes desta feature existir, o sistema DEVE usar a migration para backfill do snapshot com o `commissionRate` atual do barbeiro (one-shot) e marcar `commissionRateBackfilled=true`.

### Requisito 5 — Filtros de Período

**User Story:** Como administrador, quero filtrar por mês ou trimestre, para análises de curto e médio prazo.

#### Critérios de Aceitação

1. Param `?month=AAAA-MM` DEVE retornar dados do mês fechado em timezone `America/Sao_Paulo`.
2. Param `?quarter=AAAA-Qn` (n∈1..4) DEVE retornar dados do trimestre correspondente.
3. `month` e `quarter` DEVEM ser mutuamente exclusivos; se ambos enviados, retornar 400.
4. Datas futuras (mês em curso contabiliza somente até hoje; mês/trimestre totalmente futuro retorna zeros).

### Requisito 6 — Export PDF e CSV

**User Story:** Como administrador, quero exportar o relatório em PDF e CSV, para compartilhar com o dono e com o contador.

#### Critérios de Aceitação

1. `GET /api/admin/financial/commission?format=pdf` DEVE reutilizar o padrão visual de `src/lib/pdf/financial-report.ts` e retornar um PDF com cabeçalho Gold Mustache, tabela resumo (por barbeiro + totais) e metadados de período.
2. `GET /api/admin/financial/commission?format=csv` DEVE retornar `text/csv; charset=utf-8` com colunas `barberId,barberName,period,gross,commissionRate,commissionAmount,houseAmount,appointmentCount`.
3. O CSV DEVE usar `;` como separador (padrão Excel pt-BR) e `.` como separador decimal (padrão contábil), com BOM UTF-8.
4. Os exports DEVEM estar disponíveis somente para usuários com role `ADMIN`.
5. LGPD: os exports NÃO DEVEM incluir dados pessoais de clientes (nome, email, telefone, CPF). Apenas IDs de barbeiros, valores e contagens.

### Requisito 7 — Exclusão de NO_SHOW e CANCELLED

**User Story:** Como administrador, quero que agendamentos não realizados não entrem no cálculo, para que a comissão reflita apenas receita efetiva.

#### Critérios de Aceitação

1. Appointments com status `CANCELLED_BY_CLIENT`, `CANCELLED_BY_BARBER` e `NO_SHOW` DEVEM ser excluídos do `gross`, do `commissionAmount` e do `appointmentCount`.
2. Apenas `COMPLETED` entra no relatório de comissão (diferente do relatório financeiro atual que considera também `CONFIRMED` passado).
3. Esta diferença DEVE ser documentada no cabeçalho do PDF e em tooltip na UI ("Apenas atendimentos concluídos").

### Requisito 8 — Feature Flag `commissionReport`

**User Story:** Como dono da barbearia, quero poder ligar/desligar essa feature, para liberar apenas quando validarmos com contador.

#### Critérios de Aceitação

1. O flag `commissionReport` DEVE ser registrado em `src/config/feature-flags.ts` com `defaultValue: false` e `clientSafe: true`.
2. QUANDO a flag está `false`, ENTÃO a aba "Comissões" em `/admin/faturamento` DEVE ficar oculta e os endpoints DEVEM retornar 404 (não 403, para não vazar existência em prod).
3. QUANDO a flag está `true`, ENTÃO a feature DEVE estar plenamente acessível para admins.
4. A flag DEVE poder ser sobrescrita via env (`FEATURE_FLAG_COMMISSION_REPORT=true`) seguindo o padrão existente.

### Requisito 9 — Auditoria de Alterações de Rate

**User Story:** Como administrador, quero rastrear quem alterou o rate e quando, para resolver disputas com barbeiros.

#### Critérios de Aceitação

1. Cada `PATCH /api/admin/barbers/[id]/commission` DEVE criar um registro em `BarberCommissionAudit` com `{ barberId, actorId, previousRate, newRate, changedAt, reason? }`.
2. O endpoint `GET /api/admin/barbers/[id]/commission/history` DEVE retornar o histórico de auditoria ordenado por `changedAt desc`, paginado (default 20).
3. Registros de auditoria NÃO PODEM ser editados ou deletados via API (append-only).
4. A auditoria DEVE estar acessível apenas a `ADMIN`.

## Requisitos Não-Funcionais

- **Performance:** relatório consolidado de um mês DEVE responder em < 500ms para até 20 barbeiros e 2000 appointments.
- **Precisão monetária:** proibido `Float`; usar `Decimal` com precisão ≥ 4 casas para rate e ≥ 2 para valores.
- **TypeScript:** proibido `any`. Usar tipos explícitos, generics e narrowing com `unknown`.
- **Validação:** Zod em todos os route handlers.
- **Tests:** TDD (RED → GREEN → REFACTOR) com coverage ≥ 85% em services e lib de cálculo.
- **i18n:** mensagens de erro/UI em pt-BR.
- **LGPD:** exports não devem expor dados pessoais de clientes.
