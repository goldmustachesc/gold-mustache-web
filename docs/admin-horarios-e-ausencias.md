# Horários globais e ausências (admin/barbeiro)

## Visão geral

- **Horário global da barbearia**: define quando a barbearia atende (por dia da semana) e permite criar **fechamentos por data** (dia inteiro ou parcial).
- **Ausências do barbeiro**: cada barbeiro pode bloquear um dia inteiro ou uma faixa de horas.

Essas regras são aplicadas **no backend** tanto em:
- `GET /api/slots` (lista de horários)
- criação de agendamentos (`POST /api/appointments` e `POST /api/appointments/guest`)

## Setup inicial

### 1) Criar o horário global padrão

Rode:

```bash
npx tsx prisma/seed-shop-hours.ts
```

Padrão aplicado:
- Domingo: fechado
- Seg–Sáb: 09:00–18:00, intervalo 12:00–13:00

### 2) Promover um usuário para ADMIN

Rode:

```bash
npx tsx prisma/seed-admin.ts "email@exemplo.com"
```

Pré-requisitos:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Uso no app

- **Barbeiro**: `/(protected)/barbeiro/ausencias` para cadastrar/remover ausências.
- **Admin**: `/(protected)/admin/barbearia/horarios` para configurar horário global e fechamentos.


