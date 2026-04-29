# Database Deploy Checklist

Executar antes de todo deploy que inclua migrations de schema.

## Índices críticos — validar após `prisma migrate deploy`

### appointments_unique_confirmed_slot (BLOCKER)

Previne double-booking. Sem este índice, race conditions acontecem mesmo com advisory locks.

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'appointments'
  AND indexname = 'appointments_unique_confirmed_slot';
```

**Esperado:** 1 linha com `WHERE (status = 'CONFIRMED')`.

Se vazio, verificar se migration foi aplicada:

```sql
SELECT migration_name, finished_at
FROM _prisma_migrations
WHERE migration_name LIKE '%rebooking%' OR migration_name LIKE '%unique%'
ORDER BY started_at DESC;
```

Se `20251227230000_fix_rebooking_unique_index_drift` ausente: rodar `pnpm prisma migrate deploy`.

**Smoke test** (executar em staging antes de prod):

```sql
-- Inserir dois appointments CONFIRMED no mesmo barbeiro/data/horário.
-- O segundo INSERT deve falhar com código 23505 (unique_violation).
INSERT INTO appointments (id, "barber_id", "service_id", date, "start_time", "end_time", status, "created_at", "updated_at")
VALUES ('test-1', '<barberId>', '<serviceId>', '2099-01-01', '10:00', '11:00', 'CONFIRMED', now(), now());

INSERT INTO appointments (id, "barber_id", "service_id", date, "start_time", "end_time", status, "created_at", "updated_at")
VALUES ('test-2', '<barberId>', '<serviceId>', '2099-01-01', '10:00', '11:00', 'CONFIRMED', now(), now());
-- ^ deve falhar com: ERROR 23505 duplicate key value violates unique constraint

-- Limpar:
DELETE FROM appointments WHERE id IN ('test-1', 'test-2');
```

### Outros índices relevantes

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'appointments' ORDER BY indexname;
```

Esperado (mínimo):
- `appointments_pkey`
- `appointments_unique_confirmed_slot`
- `idx_appointments_barber_date_status` (ou similar)
- `idx_appointments_client_date`

## Checklist completo

- [ ] `pnpm prisma migrate status` — zero migrations pendentes
- [ ] `appointments_unique_confirmed_slot` presente (query acima)
- [ ] Smoke test de double-booking em staging
- [ ] `pnpm test src/services/__tests__/booking.service.test.ts` verde
- [ ] Backup do banco prod antes de migrations destrutivas

## Contato em caso de bloqueio

Migration travada? Verificar locks ativos:

```sql
SELECT pid, query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

Forçar encerramento de conexão bloqueante (cuidado):

```sql
SELECT pg_terminate_backend(<pid>);
```
