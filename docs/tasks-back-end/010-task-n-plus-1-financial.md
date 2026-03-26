# 010 - Corrigir N+1 query no endpoint financeiro

## Prioridade: 🟡 MÉDIA (Performance)

## Problema

O endpoint `GET /api/admin/financial` faz **2 queries por barbeiro** dentro de um loop. Se a barbearia tem 5 barbeiros, são 10 queries extras desnecessárias. Com 20 barbeiros, seriam 40.

## Arquivo afetado

`src/app/api/admin/financial/route.ts` — linhas 317-346

```typescript
// ❌ N+1: loop com query individual por barbeiro
const allBarbers = await prisma.barber.findMany({
  where: { active: true },
  select: { id: true },
});

for (const barber of allBarbers) {
  const workingHours = await prisma.workingHours.findMany({     // Query 1 por barbeiro
    where: { barberId: barber.id },
  });

  const absences = await prisma.barberAbsence.findMany({        // Query 2 por barbeiro
    where: {
      barberId: barber.id,
      date: { gte: startDate, lte: endDate },
    },
  });

  // ... cálculo
}
```

## O que corrigir

Buscar tudo em **2 queries únicas** usando `where: { barberId: { in: [...] } }`:

```typescript
// ✅ Apenas 3 queries no total (independente do número de barbeiros)
const allBarbers = await prisma.barber.findMany({
  where: { active: true },
  select: { id: true },
});

const barberIds = allBarbers.map(b => b.id);

const allWorkingHours = await prisma.workingHours.findMany({
  where: { barberId: { in: barberIds } },
});

const allAbsences = await prisma.barberAbsence.findMany({
  where: {
    barberId: { in: barberIds },
    date: { gte: startDate, lte: endDate },
  },
});

// Agrupar por barbeiro em memória
for (const barber of allBarbers) {
  const workingHours = allWorkingHours.filter(wh => wh.barberId === barber.id);
  const absences = allAbsences.filter(a => a.barberId === barber.id);
  // ... cálculo
}
```

## Impacto

- **Antes:** 1 + 2N queries (N = número de barbeiros ativos)
- **Depois:** 3 queries fixas, independente do número de barbeiros

## Checklist

- [x] Refatorar para buscar workingHours em batch com `{ in: barberIds }`
- [x] Refatorar para buscar absences em batch com `{ in: barberIds }`
- [x] Agrupar resultados por barbeiro em memória
- [x] Testar que o cálculo financeiro retorna os mesmos valores
- [x] Verificar se há N+1 semelhante em outros endpoints (barber ranking, feedbacks stats)
