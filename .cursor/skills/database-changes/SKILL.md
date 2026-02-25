---
name: database-changes
description: Workflow para alterações de schema Prisma, migrações e mudanças no banco de dados. Use quando o usuário quiser alterar o schema do banco, criar migrações, adicionar campos/tabelas, ou trabalhar com Prisma.
---

# Database Changes - Gold Mustache

## Instruções

Siga este fluxo ao alterar o banco de dados:

### Fase 1: Planejamento

1. **Consulte o ER Diagram**: Leia `docs/architecture/02-entity-relationship.md` para entender as relações.
2. **Revise o schema atual**: Leia `prisma/schema.prisma`.
3. **Documente a mudança**:
   - O que será adicionado/alterado/removido
   - Quais tabelas são afetadas
   - Impacto em queries existentes
   - Necessidade de migration de dados

### Fase 2: Análise de Impacto

Antes de alterar o schema, identifique todos os consumidores:

```bash
# Encontre todas as queries Prisma que usam o modelo
rg "prisma\.modelName" src/ --type ts
rg "modelName" src/types/ --type ts
```

Verifique:
- [ ] Queries existentes continuarão funcionando?
- [ ] Campos obrigatórios têm default ou migration de dados?
- [ ] Relações existentes serão preservadas?
- [ ] Índices adequados para as queries mais comuns?

### Fase 3: Alteração do Schema

#### Boas Práticas Prisma

```prisma
// Nomes de modelo em PascalCase singular
model Appointment {
  // IDs como UUID
  id        String   @id @default(uuid())

  // Timestamps padrão
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Campos opcionais explícitos
  notes     String?

  // Relações tipadas
  barber    Barber   @relation(fields: [barberId], references: [id])
  barberId  String   @map("barber_id")

  // Índices para queries frequentes
  @@index([barberId, startTime])

  // Nome da tabela em snake_case plural
  @@map("appointments")
}
```

#### Adicionando campo obrigatório a tabela existente

Se a tabela já tem dados, adicione com default ou em 2 passos:

```prisma
// Passo 1: Adicione como opcional
newField String?

// Passo 2: Após popular os dados, torne obrigatório
newField String
```

#### Enums

```prisma
enum AppointmentStatus {
  CONFIRMED
  COMPLETED
  CANCELLED_BY_CLIENT
  CANCELLED_BY_BARBER
  NO_SHOW
}
```

### Fase 4: Migration

```bash
# Gere a migration (desenvolvimento)
npx prisma migrate dev --name descricao_da_mudanca

# Gere o client atualizado
npx prisma generate

# Verifique o SQL gerado
# Revise o arquivo em prisma/migrations/[timestamp]_descricao/migration.sql
```

Nomeie migrations descritivamente:

```
add_loyalty_points_table
add_notes_to_appointments
rename_phone_to_phone_number
create_feedback_indexes
```

### Fase 5: Atualização do Código

Após alterar o schema, atualize:

1. **Types**: Atualize interfaces em `src/types/` se existirem
2. **Queries**: Atualize `select`/`include` nas queries Prisma
3. **Validação**: Atualize schemas Zod que refletem o modelo
4. **API Routes**: Atualize endpoints que retornam/recebem o modelo

### Fase 6: Validação

```bash
# Verifica se o schema é válido
npx prisma validate

# Gera o client
npx prisma generate

# Verifica compilação
pnpm build
```

### Fase 7: Atualização de Documentação

Se a mudança for significativa, atualize:
- `docs/architecture/02-entity-relationship.md`
- `docs/architecture/03-class-diagram.md`

## Comandos Prisma Úteis

| Comando | Uso |
|---------|-----|
| `npx prisma validate` | Validar schema sem gerar nada |
| `npx prisma generate` | Gerar Prisma Client |
| `npx prisma migrate dev --name x` | Criar e aplicar migration (dev) |
| `npx prisma migrate deploy` | Aplicar migrations pendentes (prod) |
| `npx prisma migrate reset` | Reset completo do banco (dev only) |
| `npx prisma db push` | Push schema sem migration (prototyping) |
| `npx prisma studio` | Interface visual do banco |
| `npx prisma format` | Formatar schema.prisma |

## Cuidados Especiais

### Deleção de Coluna/Tabela
- Verifique que nenhum código referencia o campo
- Considere soft-delete antes de hard-delete
- Faça backup dos dados se necessário

### Campos Sensíveis (LGPD)
- Dados pessoais devem ser identificáveis para exportação/deleção
- Verifique `US-PROF-02` e `US-PROF-03` em `01-requirements.md`
- GuestClient deve ser anonimizável

### Performance
- Adicione `@@index` para campos usados em `WHERE` frequente
- Use `@@unique` para constraints de negócio
- Considere composite indexes para queries com múltiplos filtros

## Checklist

- [ ] ER Diagram consultado
- [ ] Impacto em queries existentes mapeado
- [ ] Schema alterado corretamente
- [ ] Migration gerada e SQL revisado
- [ ] Prisma Client regenerado
- [ ] Código consumidor atualizado
- [ ] Schemas Zod atualizados
- [ ] `npx prisma validate` passa
- [ ] `pnpm build` passa
- [ ] Documentação atualizada (se necessário)
