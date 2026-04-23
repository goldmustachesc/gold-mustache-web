# Auditoria de Staging — Agendamentos do Site

**Data:** 2026-04-23  
**Ambiente auditado:** `https://www.staging.goldmustachebarbearia.com.br`  
**Banco auditado:** projeto Supabase `rryqlodtplycjnftuuhi` (carregado do `.envrc`)  
**Foco:** prontidão operacional para promover os agendamentos do próprio site para produção

## Veredito

**Status final: NAO APTO PARA PRODUCAO**

O fluxo público principal de agendamento está funcional em staging hoje, mas o ambiente **não é confiável como candidato de release** porque há drift simultâneo de **deploy** e **schema**:

1. o deploy público de staging não expõe a rota `POST /api/cron/appointment-reminders`, embora ela exista no branch atual e em `vercel.json`;
2. o banco de staging ainda não recebeu a migration `20260423100000_add_phone_normalized_and_history_indexes`, e a coluna `profiles.phone_normalized` segue ausente;
3. o código atual já depende dessa coluna em fluxos de booking e criação/atualização de perfil.

Enquanto isso não for reconciliado, o staging atual não certifica o que de fato iria para produção.

## O que passou

- Home de staging respondeu `307` no apex para `www` e `200` na página final.
- `robots.txt` respondeu `200` com `Disallow: /`.
- `sitemap.xml` respondeu `200` e permaneceu vazio, como esperado para staging.
- `GET /api/services` respondeu `200` com **17** serviços ativos.
- `GET /api/barbers` respondeu `200` com **5** barbeiros.
- `GET /api/slots?date=2026-04-30&barberId=08dbc02a-e89d-426d-ae10-016788a9b0e6&serviceId=8505d744-1c4c-412b-8e93-72fdc4a190dc` respondeu `200` com janelas `09:00-12:00` e `13:00-18:00`.
- `POST /api/appointments/guest` com `Origin` malicioso respondeu `403` (`Origem não permitida`).
- Smoke real do guest booking passou ponta a ponta:
  - criação: `201`
  - lookup por token: `200`
  - cancelamento: `200`
  - lookup pós-cancelamento: status `CANCELLED_BY_CLIENT`

## Bloqueadores

### 1. Drift de deploy no staging público

**Evidência atual**

- `POST /api/cron/sync-instagram` -> `401` sem segredo, comportamento esperado.
- `POST /api/cron/loyalty/expire-points` -> `401` sem segredo, comportamento esperado.
- `POST /api/cron/loyalty/birthday-bonuses` -> `401` sem segredo, comportamento esperado.
- `POST /api/cron/appointment-reminders` -> **`404`**.

**Por que isso bloqueia**

No código atual, a rota existe em [src/app/api/cron/appointment-reminders/route.ts](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/src/app/api/cron/appointment-reminders/route.ts) e o cron está declarado em [vercel.json](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/vercel.json). O branch atual também contém a implementação de lembretes em [src/services/appointment-reminders.ts](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/src/services/appointment-reminders.ts).

Se staging responde `404` para essa rota, há duas leituras possíveis, ambas ruins para promoção:

- o deploy público está atrasado em relação ao branch `staging`; ou
- o artefato publicado não representa corretamente o código candidato.

Em ambos os casos, **staging não é um espelho confiável da release**.

### 2. Drift de schema no banco de staging

**Evidência atual**

- `pnpm db:migrate:status` retornou migration pendente:
  - `20260423100000_add_phone_normalized_and_history_indexes`
- Ao consultar o banco de staging diretamente, a coluna `profiles.phone_normalized` **não existe**.

**Por que isso bloqueia**

O código atual já depende desse campo em rotas e serviços do fluxo de booking:

- [src/services/booking.ts](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/src/services/booking.ts): checagem de telefone banido usa `phoneNormalized`
- [src/app/api/appointments/route.ts](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/src/app/api/appointments/route.ts): criação automática de perfil grava `phoneNormalized`
- [docs/runbooks/phone-normalized-online-rollout.md](/Users/leonardobrizolla/Developer/GoldMustache/gold-mustache-web/docs/runbooks/phone-normalized-online-rollout.md): já existe runbook específico para reconciliar essa mudança

Isso significa que, quando o código atual for realmente implantado, há risco concreto de falha em:

- criação/atualização de perfil em fluxos autenticados;
- validações relacionadas a telefone normalizado;
- endurecimentos recentes de booking e banimento.

### 3. Staging atual valida um fluxo antigo, não o branch atual

O fato de o smoke de guest booking ter passado **não elimina** o risco acima. Pelo contrário: combinado com a ausência da rota de lembretes e com a coluna faltando no banco, o resultado mais provável é que o site público em staging esteja rodando uma versão anterior do código, ainda compatível com o schema antigo.

Portanto, o staging hoje prova apenas que **um fluxo legado ainda funciona**, não que **o candidato atual de release** esteja pronto para produção.

## Observacoes operacionais

- Não executei o cron com `CRON_SECRET` para evitar side effects reais em staging.
- Não reexecutei login OAuth, fluxo de barbeiro ou fluxo admin nesta rodada; o objetivo foi priorizar o operacional crítico do booking público e a coerência entre deploy e banco.
- A tabela de feature flags não retornou registros explícitos para `appointmentReminders`. Mesmo após corrigir o `404`, ainda será necessário validar se a feature está habilitada por banco ou por env override no deploy.

## Recomendacao objetiva

**Nao promover para producao ainda.**

## Plano de saida

1. Reconciliar o banco de staging com a migration `20260423100000_add_phone_normalized_and_history_indexes`.
2. Fazer novo deploy de staging a partir do branch atual e confirmar que `POST /api/cron/appointment-reminders` deixa de responder `404`.
3. Revalidar:
   - `pnpm db:migrate:status` -> sem pendencias
   - `POST /api/cron/appointment-reminders` -> `401` sem segredo e `200/skipped` ou `200` com segredo
   - smoke de agendamento guest
   - ao menos um smoke autenticado
4. So depois disso reabrir o gate de producao.

## Evidencias resumidas

```text
GET  /pt-BR                                              -> 307 -> 200
GET  /robots.txt                                         -> 200
GET  /sitemap.xml                                        -> 200
GET  /api/services                                       -> 200
GET  /api/barbers                                        -> 200
GET  /api/slots?...                                      -> 200
POST /api/appointments/guest (Origin invalido)           -> 403
POST /api/appointments/guest (smoke real)                -> 201
GET  /api/appointments/guest/lookup                      -> 200
PATCH /api/appointments/guest/{id}/cancel                -> 200
POST /api/cron/sync-instagram                            -> 401
POST /api/cron/loyalty/expire-points                     -> 401
POST /api/cron/loyalty/birthday-bonuses                  -> 401
POST /api/cron/appointment-reminders                     -> 404
pnpm db:migrate:status                                   -> 1 migration pendente
SQL direto no banco                                      -> profiles.phone_normalized ausente
```
