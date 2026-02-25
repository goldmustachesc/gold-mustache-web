# 023 - Avaliar uso de Server Actions para mutações simples

## Prioridade: 🟢 BAIXA (Melhoria / Modernização)

## Problema

O projeto usa **exclusivamente API routes** para todas as mutações (POST, PUT, DELETE). Server Actions do Next.js poderiam simplificar operações que são chamadas apenas por componentes do próprio app, eliminando a necessidade de:
- Criar endpoint HTTP
- Fazer fetch no client
- Tratar CORS/Origin manualmente
- Gerenciar estados de loading no client

## Candidatos para Server Actions

Operações simples que são chamadas apenas pelo front-end do próprio app:

| Operação | Rota atual | Complexidade |
|----------|-----------|--------------|
| Marcar notificação como lida | `POST /api/notifications/[id]/read` | Baixa |
| Marcar todas notificações lidas | `POST /api/notifications/mark-all-read` | Baixa |
| Salvar consentimento LGPD | `POST /api/consent` | Baixa |
| Atualizar perfil | `PUT /api/profile/me` | Média |
| Atualizar working hours | `PUT /api/barbers/me/working-hours` | Média |

## O que NÃO migrar

Manter como API routes:
- **Endpoints públicos** (`/api/slots`, `/api/services`, `/api/barbers`) — podem ser chamados externamente
- **Endpoints de guest** — usam token em header, não auth de sessão
- **Endpoints de cron** — chamados externamente (Vercel Cron)
- **Operações complexas** (`/api/appointments` POST) — envolvem concurrency locks, múltiplos serviços

## Benefícios

- Menos boilerplate (sem fetch, sem endpoint HTTP)
- Proteção CSRF automática (Server Actions usam tokens internos)
- Tipagem end-to-end (TypeScript direto do server pro client)
- Melhor DX com `useFormState` / `useActionState`

## Riscos

- Migração gradual pode criar inconsistência (parte API route, parte Server Action)
- Server Actions não são ideais se precisar de rate limiting customizado
- Requer refatoração dos componentes client que consomem essas rotas

## Recomendação

Implementar em **novos features** primeiro. Migrar existentes apenas se houver refatoração planejada do componente que consome a rota.

## Checklist

- [ ] Decidir se vale a pena migrar agora ou apenas para novas features
- [ ] Se migrar, começar pelas notificações (mais simples)
- [ ] Criar padrão de Server Action com validação Zod
- [ ] Documentar quando usar Server Action vs API Route
- [ ] Testar que auth funciona corretamente via Server Action
