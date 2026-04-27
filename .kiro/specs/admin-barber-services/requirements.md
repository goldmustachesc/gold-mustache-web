# Requirements — admin-barber-services

Referencia de backlog: auditoria 2026-04-15, P1 #8 (areas: Admin e Servicos).

## Contexto e problema

- O schema Prisma ja define o join `BarberService (barberId, serviceId)` (ver `prisma/schema.prisma`), mas hoje nao existe UI nem API de admin para gerenciar essa relacao.
- A logica de booking ja consulta o join: `src/services/booking.ts` usa `isServiceAvailableForBarber` e `getServices(barberId)` filtrando por `barbers: { some: { barberId } }`.
- Com a tabela `BarberService` vazia em producao, `getServices(barberId)` retorna [] e `bookAppointment` lanca `SLOT_UNAVAILABLE`. Ou seja: a logica "barbeiro so faz o servico se estiver associado" ja esta ativa, mas sem dados, nenhum agendamento passa — daqui a necessidade de uma estrategia explicita de bootstrap e/ou flag retroativa.
- Nao existe override de `price`/`duration` por barbeiro no schema atual. Este spec registra esse requisito como opcional (gated por migracao) e mantem o MVP sem overrides.

## Stakeholders

- Admin (gestor da barbearia): define quem faz o que.
- Barbeiros: veem sua lista de servicos sendo respeitada pelo booking.
- Clientes: so conseguem agendar pares (barbeiro, servico) suportados.

## Escopo

### Dentro do escopo

1. UI admin em forma de matriz (barbeiros x servicos) com toggle por celula.
2. UI admin por barbeiro: lista de servicos com checkboxes (adicionar/remover).
3. UI admin por servico: lista de barbeiros com checkboxes (adicionar/remover).
4. Estrategia de bootstrap/retrocompatibilidade obrigatoria (seed inicial + fallback runtime controlado por flag).
5. Validacao server-side reforcada na criacao/reagendamento de agendamentos.
6. Integracao automatica das UIs de booking (chat e classica) para refletir o filtro.
7. Invalidacao das caches do booking (`public-services`, etc.) ao salvar mudancas.
8. Trilha de auditoria minima (log append-only) das alteracoes de associacao feitas por admin.
9. Coerencia com o padrao atual de soft/hard delete de `Barber`/`Service`.

### Fora do escopo (explicitamente)

- Overrides de preco e duracao por barbeiro (fica registrado como R5 opcional; so entra se schema for estendido em um follow-up).
- Gestao de especializacoes/tags de barbeiros alem do mapeamento servico-barbeiro.
- Painel de metricas por servico/barbeiro.
- Importacao em massa via CSV.

## Formato EARS

### Requisitos

#### R1 — Matriz admin (visao consolidada)

- R1.1 (Ubiquitous): O sistema deve expor em `/{locale}/admin/barbearia/barbeiros-servicos` uma matriz com as linhas = barbeiros ativos e inativos (com rotulo visual de inativos), colunas = servicos ativos e inativos.
- R1.2 (Event-driven): Quando o admin alterar uma celula da matriz, o sistema deve persistir a mudanca em lote (debounce ou confirmacao explicita via botao "Salvar") e exibir toast de sucesso/erro.
- R1.3 (State-driven): Enquanto a requisicao estiver em voo, o sistema deve mostrar estado de carregamento na celula sem bloquear o resto da matriz.
- R1.4 (Unwanted behavior): Se o admin nao estiver autenticado com role ADMIN, o sistema deve negar acesso e redirecionar conforme padrao da area protegida.

#### R2 — Edicao por barbeiro

- R2.1 (Event-driven): Quando o admin abrir a pagina de detalhe do barbeiro (`/{locale}/admin/barbeiros/[id]/servicos`), o sistema deve listar todos os servicos com um checkbox marcado quando existir `BarberService(barberId, serviceId)`.
- R2.2 (Event-driven): Quando o admin marcar ou desmarcar checkboxes e confirmar, o sistema deve aplicar um diff: criar os novos pares e remover os desmarcados em uma unica transacao.
- R2.3 (Unwanted behavior): Se a operacao falhar parcialmente, a transacao deve ser revertida e o estado da UI nao deve mudar.

#### R3 — Edicao por servico

- R3.1 (Event-driven): Quando o admin abrir `/{locale}/admin/barbearia/servicos/[id]/barbeiros`, o sistema deve listar todos os barbeiros ativos com checkbox marcado conforme `BarberService`.
- R3.2 (Event-driven): Quando o admin salvar, o sistema deve aplicar o diff em uma unica transacao, idem R2.2.
- R3.3 (Unwanted behavior): Se o servico estiver inativo, o sistema deve exibir aviso mas permitir edicao (admin pode preparar antes de reativar).

#### R4 — Bootstrap e retrocompatibilidade do booking

- R4.1 (Ubiquitous): O sistema deve fornecer uma migracao/seed inicial que popule `BarberService` com o produto cartesiano de `Barber(active=true)` x `Service(active=true)` caso a tabela esteja vazia no primeiro deploy desta feature.
- R4.2 (Ubiquitous): O sistema deve introduzir a feature flag `barber_services_enforced` em `FeatureFlag` com default `false`. Enquanto estiver `false`, `booking.ts` deve aceitar o par (barberId, serviceId) mesmo sem linha em `BarberService`, preservando o comportamento historico.
- R4.3 (State-driven): Quando a flag `barber_services_enforced = true`, `booking.ts` deve rejeitar agendamentos com `SLOT_UNAVAILABLE` se nao existir `BarberService` para o par.
- R4.4 (Event-driven): Quando o admin criar um novo `Barber`, o sistema deve associar automaticamente todos os servicos ativos a esse barbeiro (comportamento "zero-surprise" ate o admin customizar). Esse comportamento deve ser passivel de desativar via constante de configuracao.
- R4.5 (Event-driven): Quando o admin criar um novo `Service`, o sistema deve associa-lo automaticamente a todos os barbeiros ativos pelo mesmo motivo. Configuravel.

#### R5 — Overrides por barbeiro (opcional, fora do MVP)

- R5.1 (Optional feature): Se a proposta de adicionar colunas `priceOverride Decimal?` e `durationOverride Int?` em `BarberService` for aprovada em design, entao o sistema deve aplicar o override no calculo de preco e na validacao de slots durante o booking; caso contrario, deve ignorar completamente.
- R5.2 (Unwanted behavior): Ate a migracao dos overrides existir, a UI nao deve exibir campos de override (evita confusao).

#### R6 — Validacao no booking

- R6.1 (Ubiquitous): Em `createAppointment`, `bookAppointment`, `bookAppointmentAsGuest` e `bookAppointmentAsLink` (todas em `src/services/booking.ts`), o sistema deve validar a associacao via `isServiceAvailableForBarber` (ja existente) antes de persistir.
- R6.2 (State-driven): Enquanto `barber_services_enforced = false`, a validacao deve aceitar pares ausentes (retrocompat R4.2). Com a flag `true`, deve rejeitar.
- R6.3 (Event-driven): Quando o admin remover um par `(barber, service)` que possui agendamentos futuros com status `CONFIRMED`, o sistema deve exibir um aviso bloqueante e obrigar confirmacao explicita antes de salvar. Agendamentos existentes nao devem ser cancelados automaticamente.

#### R7 — UI de booking filtra automaticamente

- R7.1 (Event-driven): Quando o cliente selecionar um barbeiro em `ChatBarberSelector` ou `BarberSelector`, o sistema deve chamar `getServices(barberId)` e mostrar apenas servicos associados (ja e o contrato, falta apenas garantir dados coerentes).
- R7.2 (Event-driven): Quando o cliente selecionar um servico primeiro, o sistema deve chamar endpoint de barbeiros filtrado por `serviceId` e listar apenas os compativeis em `BarberSelector`/`ChatBarberSelector`.
- R7.3 (State-driven): Se um servico nao tiver nenhum barbeiro associado (apos enforcement), o sistema deve esconder esse servico da lista publica e registrar aviso para o admin.

#### R8 — Auditoria admin

- R8.1 (Event-driven): Quando o admin criar, atualizar ou remover associacoes, o sistema deve registrar em log estruturado (tabela nova `AdminAuditLog` ou equivalente; design.md define) com campos: `actorId`, `action` ("BARBER_SERVICE_ADDED"/"BARBER_SERVICE_REMOVED"), `barberId`, `serviceId`, `createdAt`.
- R8.2 (Ubiquitous): O log deve ser append-only; nao deve ser editavel via API.

#### R9 — Soft/hard delete coerente

- R9.1 (Event-driven): Quando um `Barber` for hard-deleted (padrao atual quando nao ha agendamentos), o sistema deve remover as linhas `BarberService` correspondentes (ja coberto pela transacao existente em `api/admin/barbers/[id]/route.ts`).
- R9.2 (Event-driven): Quando um `Service` for soft-deleted (`active=false`), o sistema deve manter as associacoes em `BarberService` mas ocultar o servico das UIs publicas.
- R9.3 (Event-driven): Quando um `Barber` for soft-deleted (`active=false`), o sistema deve manter as associacoes em `BarberService` e ocultar o barbeiro das UIs publicas de booking.
- R9.4 (Event-driven): Quando um `Service` for reativado, todas as associacoes preservadas voltam a valer automaticamente.

#### R10 — i18n e acessibilidade

- R10.1 (Ubiquitous): Todos os textos novos devem existir nos locales `pt-BR` e `en` em `src/i18n/messages/*.json` (ou estrutura equivalente usada no projeto).
- R10.2 (Ubiquitous): A matriz deve ter labels acessiveis em cada checkbox (nome do barbeiro + nome do servico) para leitores de tela.

## Criterios de aceitacao globais

- Sem `any` em TypeScript novo.
- Cobertura de testes: unit tests para service layer (associar/remover/bootstrap), integration tests para rotas admin, property/integration test do booking cobrindo a flag `barber_services_enforced` em ambos estados.
- `pnpm test:gate` verde.
- Commit seguindo Conventional Commits.
- Documentacao do bootstrap e da flag registrada em `docs/` e na propria PR.

## Riscos

- Risco alto: enforcement imediato sem seed deixa todos os agendamentos retornando `SLOT_UNAVAILABLE`. Mitigacao: flag default `false` + seed no mesmo deploy.
- Risco medio: inconsistencia entre matriz e cache do `getServices` (`unstable_cache` em `src/services/booking.ts`). Mitigacao: chamar `revalidateTag`/`revalidatePath` no handler admin.
- Risco baixo: regressao de UX quando um cliente tinha um fluxo aberto e o admin remove a associacao no meio. Mitigacao: validacao final em `bookAppointment*` ja bloqueia (R6.1).

## Rastreabilidade

- R1-R3 -> design.md secao "UI admin".
- R4 -> design.md secao "Bootstrap e feature flag".
- R5 -> design.md secao "Overrides (futuro)".
- R6-R7 -> design.md secao "Integracao com booking".
- R8 -> design.md secao "Auditoria".
- R9 -> design.md secao "Soft/hard delete".
- R10 -> tasks.md secao i18n.
