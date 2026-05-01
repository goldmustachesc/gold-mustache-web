# Brainstorm — Duração de serviço por barbeiro

> Fase 0 (Tier Full). Documento exploratório, não decisório. Próximo passo: `requirements.md`.

## 1. Problema

Hoje a duração de cada serviço (`Service.duration`, em minutos) é **global**: o "Corte Degradê Tradicional" dura 30 minutos para qualquer barbeiro. Na prática, barbeiros têm ritmos diferentes — alguns terminam mais rápido, outros mais lentos. Isso causa:

- **Slots travados além do necessário** quando o barbeiro é rápido (ociosidade artificial na agenda).
- **Atrasos em cascata** quando o barbeiro é mais lento que a duração padrão (cliente seguinte espera, experiência ruim).
- **Receita perdida**: barbeiro ágil poderia atender mais clientes/dia.
- **Falta de previsibilidade** para o cliente final.

## 2. Estado atual (evidências do código)

- `prisma/schema.prisma`
  - `Service.duration: Int` (linha 101) — única fonte de duração.
  - `BarberService` (linhas 133–142) — *junction* pura (`barberId`, `serviceId`), **sem** duração.
- `src/services/booking.ts` consome `service.duration` para calcular slots e validar disponibilidade.
- UI admin: `src/app/[locale]/(protected)/admin/barbeiros/[id]/servicos/BarberServicosPageClient.tsx` permite apenas marcar/desmarcar serviços, sem ajustar tempo.

## 3. Hipóteses a validar

1. **H1 — Variação real é significativa.** A diferença entre barbeiros vale a complexidade. *(Validar com 2–3 barbeiros: registrar tempo real de 10 atendimentos por serviço.)*
2. **H2 — Override por barbeiro basta.** Não precisamos modelar variação por cliente, por horário do dia, ou aprendizado adaptativo. *(Hipótese KISS — começar simples.)*
3. **H3 — Barbeiros vão configurar sozinhos.** Se a UI for boa, eles ajustam. Se não, vira responsabilidade do admin. *(Definir owner do dado.)*
4. **H4 — Duração afeta apenas o agendamento futuro.** Agendamentos já criados mantêm a duração que tinham na criação. *(Imutabilidade histórica.)*

## 4. Opções de modelagem

### Opção A — Adicionar `durationOverride` em `BarberService`
```prisma
model BarberService {
  barberId          String  @map("barber_id")
  serviceId         String  @map("service_id")
  durationOverride  Int?    @map("duration_override") // minutos; null = usa Service.duration
  ...
}
```
- ✅ Mínimo invasivo, semanticamente claro (`override` opcional).
- ✅ Junction continua barata; só vira override quando configurado.
- ✅ Fallback natural: `barberService.durationOverride ?? service.duration`.
- ⚠️ Booking precisa carregar a relação `BarberService` correta junto do `Service`.

### Opção B — Tabela separada `BarberServiceConfig`
- ✅ Permite expandir no futuro (preço por barbeiro, comissão por barbeiro, etc.).
- ❌ Overengineering agora. YAGNI.

### Opção C — Mover `duration` totalmente para `BarberService`
- ❌ Quebra catálogo público (cliente vê o serviço antes de escolher barbeiro).
- ❌ Migração custosa. Rejeitado.

### Opção D — Multiplicador por barbeiro (ex.: 0.8x, 1.2x)
- ✅ Configuração simples (um número por barbeiro, não por serviço).
- ❌ Granularidade ruim: barbeiro pode ser rápido em corte e lento em barba.
- ❌ Resultado em frações de minuto exige arredondamento.

**Recomendação preliminar:** **Opção A**. Resolve o problema com 1 coluna e mantém invariantes do catálogo.

## 5. Lugares que precisam mudar (mapa de impacto)

- **Schema + migration**: adicionar `durationOverride`.
- **Cálculo de slots** (`src/services/booking.ts`): usar `effectiveDuration(barberId, serviceId)`.
- **Smart time picker** (`src/lib/booking/smart-time-picker.ts`): mesma fonte de verdade.
- **API admin** (`/api/admin/barbers/[id]`): aceitar `durationOverride` ao salvar serviços do barbeiro.
- **UI admin barbeiro→serviços**: campo de minutos por card, ao lado de "Selecionado". Visual: `45 min · R$ 60,00 · Você: 50 min`.
- **Histórico**: `Appointment` deve **persistir a duração no momento da criação** (já é prática comum; conferir se hoje fazemos isso). Caso negativo, adicionar `Appointment.duration`.

## 6. Decisões em aberto (para `requirements.md`)

- [ ] **Quem edita?** Admin sempre? Barbeiro também (auto-serviço)? Ambos com permissão diferente?
- [ ] **Limites?** Permitir qualquer valor ou clamp (ex.: ±50% do `Service.duration`)?
- [ ] **Granularidade?** Múltiplos de 5 ou 15 minutos? (Bate com `WorkingHours` e grid de slots.)
- [ ] **Default exibido na UI?** Mostrar campo pré-preenchido com `Service.duration` ou só placeholder?
- [ ] **Cliente final vê?** Na tela de seleção de horário, mostramos a duração efetiva ou a padrão?
- [ ] **Auditoria?** Logar quem mudou e quando? (Útil se houver disputa de comissão.)
- [ ] **Reagendamentos?** Se override muda depois, o agendamento existente recalcula? *(Recomendação: não — imutável.)*

## 7. Riscos

- **R1 — Inconsistência slot vs. realidade.** Mesmo com override, barbeiro pode atrasar. Mitigação fora de escopo (já existe buffer/overlap em outro lugar?).
- **R2 — Drift do dado.** Barbeiro configura uma vez e nunca atualiza. Mitigação: relatório mensal "tempo real vs. configurado" (futuro, não nesta entrega).
- **R3 — Migração.** Coluna nova `NULL` em registros existentes — seguro, sem default.
- **R4 — Cache de booking.** Se houver cache de slots, invalidar quando override mudar.

## 8. Esboço de UX (a refinar no `design.md`)

```
┌─────────────────────────────────────────┐
│ Corte Degradê Tradicional   [Selecionado] │
│ Padrão: 30 min · R$ 45,00                │
│ Sua duração: [ 35 ] min      ⓘ          │
└─────────────────────────────────────────┘
```
- Campo numérico discreto, só aparece quando `Selecionado`.
- Tooltip explica: *"Tempo que você leva neste serviço. Se vazio, usamos o padrão."*
- Botão "Restaurar padrão" limpa o override.

## 9. Métricas de sucesso

- Variação média entre `Service.duration` e overrides configurados (≥10 min indica que valeu a pena).
- Redução de atrasos reportados (qualitativo via barbeiros).
- Aumento de atendimentos/dia para barbeiros rápidos.

## 10. Próximo passo

`/kiro/spec-init "barber-service-duration"` → `/kiro/spec-requirements barber-service-duration` para travar:
- Quem edita
- Limites e granularidade
- Visibilidade para cliente final
- Estratégia de imutabilidade histórica
