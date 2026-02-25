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

### Fase 4: Implementação

Siga esta ordem de implementação:

#### 4.1 Schema (se necessário)
- Atualize `prisma/schema.prisma`
- Gere migration: `npx prisma migrate dev --name nome_descritivo`
- Gere client: `npx prisma generate`

#### 4.2 Tipos e Contratos
- Defina types em `src/types/`
- Defina schemas Zod para validação de input

#### 4.3 Service Layer
- Crie/atualize services em `src/services/`
- Mantenha lógica de negócio isolada do framework

#### 4.4 API Routes
- Crie route handlers em `src/app/api/`
- Valide inputs com Zod
- Trate erros adequadamente
- Verifique autenticação/autorização

#### 4.5 UI Components
- Componentes reutilizáveis em `src/components/ui/`
- Componentes específicos em `src/components/custom/`
- Use Tailwind + `clsx`/`tailwind-merge`
- Consulte Brand Book para decisões visuais

#### 4.6 Pages
- Crie pages em `src/app/`
- Use Server Components por padrão
- Client Components apenas quando necessário (interatividade)

### Fase 5: Validação

Execute antes de considerar completo:

```bash
pnpm lint        # Verifica padrões Biome
pnpm build       # Valida compilação
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

- [ ] Todos os arquivos usam TypeScript (`.ts`/`.tsx`)
- [ ] Imports usam alias `@/`
- [ ] Sem `any` não justificado
- [ ] Sem `console.log` em código de produção
- [ ] Componentes PascalCase, hooks prefixo `use`, utils camelCase
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] Feature funciona end-to-end
- [ ] Brand Book respeitado (se UI)
