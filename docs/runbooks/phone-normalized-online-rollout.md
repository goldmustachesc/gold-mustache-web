# Rollout online de `phone_normalized` em produção

Este runbook evita lock longo em produção para a mudança de telefone normalizado e índices relacionados.

## Quando usar

Use este fluxo quando a migration `20260423100000_add_phone_normalized_and_history_indexes` ainda **não** foi aplicada em produção.

## Estratégia

1. Executar SQL online (backfill em lotes + índices `CONCURRENTLY`) via script manual.
2. Marcar a migration como aplicada com `prisma migrate resolve`.
3. Seguir deploy normal da aplicação.

Em produção, não rode `prisma migrate deploy` diretamente para esta mudança. Use `pnpm db:migrate:deploy`, que valida se o rollout online já foi resolvido antes de aplicar migrations pendentes.

## 1) Executar SQL online

Rode o arquivo [prisma/manual/20260423_phone_normalized_online.sql](../../prisma/manual/20260423_phone_normalized_online.sql) no banco de produção.

## 2) Marcar migration como aplicada

```bash
pnpm prisma migrate resolve --applied 20260423100000_add_phone_normalized_and_history_indexes
```

## 3) Validação rápida

```sql
SELECT COUNT(*) AS pending_rows
FROM profiles
WHERE phone IS NOT NULL
  AND phone_normalized IS NULL;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'profiles_phone_normalized_idx',
    'appointments_client_id_date_idx',
    'appointments_guest_client_id_date_idx'
  );
```

## Observações

- Não editar migration já aplicada em outros ambientes para evitar divergência de checksum.
- O script online é idempotente e pode ser reexecutado com segurança.
