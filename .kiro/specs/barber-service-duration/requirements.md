# Requirements — Duração de serviço por barbeiro

> Fase 1 (Tier Full). Decisões traváveis. Próximo: `design.md`.

## Visão geral

Cada barbeiro pode definir uma **duração própria** para cada serviço que executa, sobrescrevendo a duração padrão do catálogo. A duração efetiva usada no agendamento é `barberService.durationOverride ?? service.duration`.

## Stakeholders

- **Admin** — configura overrides de qualquer barbeiro.
- **Barbeiro** — *(fase 2)* configura os próprios overrides via área "Meu perfil". MVP é só admin.
- **Cliente final** — vê a duração efetiva (do barbeiro escolhido) na seleção de horário.

## Escopo

### Dentro
- Coluna `durationOverride: Int?` em `BarberService`.
- UI admin para editar override por serviço dentro da página de serviços do barbeiro.
- Cálculo de slots usa duração efetiva.
- Catálogo público (`/agendar`) usa duração efetiva após escolha do barbeiro.
- Migration aditiva, sem default (NULL = usa padrão).

### Fora
- Auto-serviço pelo barbeiro (fase 2).
- Override de **preço** por barbeiro.
- Aprendizado adaptativo / sugestão automática baseada em histórico real.
- Relatório "tempo configurado vs. real".
- Multiplicador global por barbeiro.

## Requisitos funcionais (EARS)

### RF1 — Modelo de dados

**RF1.1** Quando o admin configura um override, o sistema **deve** persistir `BarberService.durationOverride` como inteiro positivo em minutos.

**RF1.2** Quando `durationOverride` é `NULL`, o sistema **deve** usar `Service.duration` como duração efetiva.

**RF1.3** O sistema **deve** validar que `durationOverride`, se presente, está no intervalo `[5, 240]` minutos e é múltiplo de `5`.

**RF1.4** O sistema **deve** rejeitar persistência de `durationOverride` igual a `Service.duration` (limpa para `NULL` no save — sem override redundante).

### RF2 — UI admin (`/admin/barbeiros/[id]/servicos`)

**RF2.1** Para cada serviço **selecionado** no barbeiro, a UI **deve** exibir um campo numérico "Sua duração" pré-preenchido com a duração efetiva atual.

**RF2.2** A UI **deve** indicar visualmente quando o valor exibido é o padrão (placeholder/badge "padrão") vs. um override (badge "personalizado").

**RF2.3** A UI **deve** oferecer ação "Restaurar padrão" que limpa o override (envia `null`).

**RF2.4** A UI **deve** desabilitar o campo de duração quando o serviço não está selecionado para o barbeiro.

**RF2.5** Ao clicar em "Salvar", a UI **deve** enviar todos os overrides em uma única requisição (idempotente) junto com a lista de serviços selecionados.

### RF3 — Booking

**RF3.1** O cálculo de slots em `src/services/booking.ts` **deve** usar a duração efetiva do par `(barber, service)`.

**RF3.2** O smart time picker em `src/lib/booking/smart-time-picker.ts` **deve** consumir a mesma fonte de duração efetiva.

**RF3.3** O cliente final, após escolher barbeiro e serviço, **deve** ver a duração efetiva (não a padrão) em qualquer texto auxiliar de UI ("Duração: X min").

**RF3.4** Ao criar `Appointment`, o sistema **deve** calcular `endTime = startTime + duraçãoEfetiva`. *(Comportamento atual já preserva isso porque `endTime` é persistido.)*

**RF3.5** Mudanças posteriores em `durationOverride` **não devem** alterar `endTime` de agendamentos já criados.

### RF4 — API

**RF4.1** O endpoint `PUT /api/admin/barbers/[id]` (ou equivalente que salva serviços do barbeiro) **deve** aceitar payload no formato:
```ts
{
  services: Array<{ serviceId: string; durationOverride: number | null }>
}
```

**RF4.2** O endpoint **deve** validar `durationOverride` per RF1.3 e retornar `400` com mensagem clara em caso de violação.

**RF4.3** O endpoint **deve** ser idempotente: enviar o mesmo payload duas vezes produz o mesmo estado.

### RF5 — Migração

**RF5.1** A migration **deve** adicionar `duration_override INT NULL` em `barber_services` sem default e sem backfill.

**RF5.2** A migration **deve** ser reversível (down migration remove a coluna).

## Requisitos não-funcionais

**RNF1 — Performance.** A leitura da duração efetiva **não deve** adicionar query extra: já carregamos `BarberService` junto de `Barber`/`Service` no booking; reaproveitar.

**RNF2 — Type safety.** Sem `any`. Tipo `EffectiveDuration = number` derivado por helper `getEffectiveDuration(barberService, service)`.

**RNF3 — Testes.**
- Unit: helper `getEffectiveDuration` com casos `null` e override válido.
- Unit: validação `[5, 240]` e múltiplo de 5.
- Integration: criação de `Appointment` usa duração efetiva.
- Integration: smart time picker reflete override.
- E2E (opcional): admin edita → cliente vê novo tempo.

**RNF4 — Observabilidade.** Logar mudanças de override (já temos audit no admin? confirmar; senão, log mínimo com `barberId`, `serviceId`, `oldDuration`, `newDuration`, `actorId`).

**RNF5 — i18n.** Strings da UI em pt-BR via mecanismo já em uso (`next-intl`).

**RNF6 — Light/Dark.** Componentes seguem tokens de `src/app/globals.css`.

## User stories

### US1 — Admin ajusta duração
> **Como** admin
> **quero** definir quanto tempo cada barbeiro leva em cada serviço
> **para** que a agenda reflita a realidade de cada profissional.

**Critérios de aceite:**
- Posso editar o tempo direto no card do serviço.
- Vejo claramente quando uso o padrão e quando personalizei.
- Posso restaurar o padrão a qualquer momento.
- Recebo erro claro se digitar valor fora dos limites.

### US2 — Cliente agenda com duração correta
> **Como** cliente
> **quero** que o horário oferecido respeite o ritmo do barbeiro escolhido
> **para** não me atrasar nem ficar com slots travados à toa.

**Critérios de aceite:**
- Após escolher barbeiro, os horários disponíveis usam a duração dele.
- Trocar de barbeiro recalcula horários disponíveis.

### US3 — Imutabilidade histórica
> **Como** admin
> **quero** que mudar uma duração no futuro não altere agendamentos já criados
> **para** preservar relatórios e comissões.

**Critérios de aceite:**
- Agendamentos antigos mantêm `endTime` original mesmo após admin mudar override.

## Decisões travadas (resolvendo abertas do brainstorm)

| Pergunta | Resposta |
|---|---|
| Quem edita? | **Admin** no MVP. Auto-serviço pelo barbeiro = fase 2. |
| Limites? | **5–240 min**, múltiplos de **5**. |
| Granularidade? | **5 min** (alinha com grid de slots). |
| Default exibido? | Campo pré-preenchido com efetivo + badge "padrão"/"personalizado". |
| Cliente final vê? | **Sim** — duração efetiva após escolher barbeiro. |
| Auditoria? | Log mínimo (`actorId`, `oldDuration`, `newDuration`). Sem tabela de histórico no MVP. |
| Reagendamentos? | **Imutável**. `Appointment.endTime` já garante isso (campo persistido). |
| Pricing? | **Fora de escopo.** Preço continua global. |

## Riscos remanescentes

- **R1 — Override inválido em runtime.** Mitigação: validar em entrada (API) e em leitura (helper retorna fallback se valor for absurdo após corrupção).
- **R2 — Cache de slots.** Se houver cache (Redis/edge), invalidar por `barberId` quando admin salvar. Confirmar existência no `design.md`.
- **R3 — Janela de transição.** Admin muda override enquanto cliente está no fluxo de booking. Aceito: cliente que já viu slot tem o tempo certo gravado no momento do submit (advisory lock + overlap check existente protege).

## Critérios de "feito"

- [ ] Migration aplicada em staging sem erro.
- [ ] Schema Prisma atualizado e tipos gerados.
- [ ] `getEffectiveDuration` helper criado com testes.
- [ ] UI admin editável e funcional (light + dark).
- [ ] API valida e persiste override.
- [ ] Booking + smart time picker usam efetiva.
- [ ] `pnpm test:gate` verde.
- [ ] Smoke test manual: admin edita → cliente vê reflexo.

## Próximo passo

`/kiro/spec-design barber-service-duration` para detalhar contrato de helper, shape da API, componente React, plano de migration e testes.
