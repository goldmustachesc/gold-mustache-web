---
name: feature-development
description: Guia completo para desenvolvimento de novas features no projeto, desde planejamento até entrega. Use quando o usuário quiser implementar uma nova funcionalidade, criar um novo módulo, ou desenvolver uma feature do zero.
---

# Feature Development - Gold Mustache

## Instruções

Siga este fluxo completo ao desenvolver uma nova feature:

### Fase 1: Planejamento

1. **Entenda o escopo**: Leia os requisitos em `docs/architecture/01-requirements.md` para localizar a User Story relacionada.
2. **Verifique o schema**: Consulte `docs/architecture/02-entity-relationship.md` e `prisma/schema.prisma` para entender as entidades envolvidas.
3. **Mapeie a arquitetura**: Consulte `docs/architecture/03-class-diagram.md` para entender os módulos existentes.
4. **Analise impacto**: Identifique todos os arquivos que serão criados ou modificados e documente dependências.

### Fase 2: Especificação (se complexa)

Para features complexas, crie documentação em `.kiro/specs/[feature-name]/`:

```
.kiro/specs/feature-name/
├── requirements.md   # User Stories + Acceptance Criteria
├── design.md         # Arquitetura + diagramas Mermaid
└── tasks.md          # Checklist de implementação
```

Templates disponíveis em:
- `.kiro/SPECIFICATION_TEMPLATE.md`
- `.kiro/DESIGN_TEMPLATE.md`
- `.kiro/TASKS_TEMPLATE.md`

### Fase 3: Preparação

1. Crie branch seguindo o padrão:

```bash
git checkout -b feat/nome-da-feature
```

2. Verifique se o projeto builda antes de começar:

```bash
pnpm build
```

### Fase 4: TDD — Testes Primeiro (OBRIGATÓRIO)

**Todo código novo começa pelos testes.** Antes de implementar qualquer service, API ou componente, escreva os testes que definem o comportamento esperado.

#### 4.1 Schema (se necessário)
- Atualize `prisma/schema.prisma`
- Gere migration: `npx prisma migrate dev --name nome_descritivo`
- Gere client: `npx prisma generate`

#### 4.2 RED — Escrever testes que FALHAM

Para cada camada da feature, crie os testes ANTES do código:

**Service tests** (`src/services/[module]/__tests__/[service].test.ts`):
- Defina o comportamento esperado de cada função do service
- Teste cenários de sucesso e todos os caminhos de erro
- Use property-based testing (fast-check) para regras de negócio
- Mock apenas Prisma e dependências externas

**Route handler tests** (`src/app/api/[route]/__tests__/route.test.ts`):
- Teste auth (401), authorization (403), validation (400), success (200/201)
- Mock o service layer — a route só orquestra
- Verifique response format (apiSuccess, apiError, apiCollection)

**Component/Page tests** (`src/components/[module]/__tests__/[Component].test.tsx`):
- Teste renderização com dados corretos
- Teste estados (loading, error, empty)
- Teste interações do usuário (clicks, forms)
- Mock hooks, não services

Rode `pnpm test` → **todos os testes DEVEM falhar** (RED).

#### 4.3 GREEN — Implementar código mínimo para passar

Implemente camada por camada, rodando testes após cada uma:

1. **Tipos e Contratos** — types em `src/types/`, schemas Zod
2. **Service Layer** — lógica de negócio em `src/services/` → `pnpm test` → GREEN
3. **API Routes** — handlers em `src/app/api/` → `pnpm test` → GREEN
4. **UI Components** — componentes e pages → `pnpm test` → GREEN

#### 4.4 REFACTOR — Limpar sem quebrar testes

- Extrair constantes, melhorar tipos, reduzir duplicação
- Verificar SOLID, KISS, YAGNI
- Rode `pnpm test` → **deve continuar GREEN**

### Fase 5: Validação

Execute antes de considerar completo:

```bash
pnpm test        # Todos os testes passando
pnpm lint        # Verifica padrões Biome
pnpm build       # Valida compilação
pnpm test:gate   # Gate completo (lint + test + coverage)
```

Teste manualmente os caminhos críticos:
- [ ] Fluxo feliz (happy path)
- [ ] Casos de erro (validação, permissão)
- [ ] Edge cases (dados vazios, limites)
- [ ] Responsividade (mobile/desktop)
- [ ] Light/Dark mode (se UI)

### Fase 6: Commit

Siga Conventional Commits:

```
feat(modulo): descrição curta da feature

Corpo explicando o que foi implementado e por quê.
```

Tipos válidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`, `revert`

## Estrutura de Diretórios

```
src/
├── app/
│   ├── api/[recurso]/route.ts     # API endpoints
│   └── (pages)/[pagina]/page.tsx  # UI pages
├── components/
│   ├── ui/                        # Primitivos reutilizáveis
│   └── custom/                    # Widgets específicos
├── hooks/                         # Custom hooks
├── services/                      # Lógica de negócio / APIs externas
├── lib/                           # Utilitários de infraestrutura
├── types/                         # Contratos TypeScript
├── config/                        # Configurações tipadas
├── constants/                     # Constantes do projeto
└── utils/                         # Funções utilitárias puras
```

## Checklist Final

- [ ] Testes escritos ANTES da implementação (TDD)
- [ ] Todos os testes passando (`pnpm test`)
- [ ] Todos os arquivos usam TypeScript (`.ts`/`.tsx`)
- [ ] Imports usam alias `@/`
- [ ] Sem `any` não justificado
- [ ] Sem `console.log` em código de produção
- [ ] Componentes PascalCase, hooks prefixo `use`, utils camelCase
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] `pnpm test:gate` passa
- [ ] Feature funciona end-to-end
- [ ] Brand Book respeitado (se UI)
