# 016 - Extrair valores hardcoded para constantes/config

## Prioridade: 🟡 MÉDIA (Manutenibilidade)

## Status: ✅ RESOLVIDO

## Problema (original)

Existiam "magic numbers" e valores hardcoded espalhados pelas rotas e serviços. Para alterar qualquer valor (ex: limite de retries do Instagram), era preciso localizar a constante no meio do código em vez de ajustar num único lugar.

## Solução aplicada

Adotada a **Opção B** (centralizar em config). Criado `src/config/api.ts` com `API_CONFIG` exportado como `as const`, agrupando todas as constantes por domínio. Valores de Instagram são configuráveis via env vars com nullish coalescing (`??`) para defaults seguros.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/config/api.ts` | **Novo** — config centralizada |
| `src/app/api/cron/sync-instagram/route.ts` | 3 constantes → `API_CONFIG.instagram.*` |
| `src/app/api/cron/cleanup-guests/route.ts` | `BATCH_SIZE` → `API_CONFIG.cron.guestCleanupBatchSize` |
| `src/app/api/admin/services/[id]/route.ts` | `MAX_SLUG_ATTEMPTS` → `API_CONFIG.slugGeneration.maxAttempts` |
| `src/app/api/admin/services/route.ts` | Idem (ocorrência extra encontrada na revisão) |
| `src/app/api/appointments/route.ts` | `7 * 24 * 60 * 60 * 1000` → `API_CONFIG.appointments.defaultRangeMs` |

## Checklist

- [x] Criar `src/config/api.ts` com constantes centralizadas
- [x] Substituir magic numbers no cron do Instagram
- [x] Substituir magic numbers no cron de limpeza
- [x] Nomear constante de range padrão em appointments
- [x] Nomear constante de max slug attempts
- [x] Revisar se há mais magic numbers não listados
  - Encontrado: `MAX_SLUG_ATTEMPTS` duplicado em `src/app/api/admin/services/route.ts` (create) — corrigido
- [ ] Corrigir o problema do `pending_` userId (task separada recomendada — ver nota abaixo)

### Nota sobre `pending_` userId (item 5)

O `src/app/api/admin/barbers/route.ts` cria barbeiros com `userId: "pending_..."` sem vínculo real com Supabase Auth. Isso não é um magic number mas sim um **design debt**: barbeiros deveriam ser vinculados a usuários reais. Recomenda-se uma task separada para implementar o fluxo correto (convite por email → criação de conta → vínculo automático).
