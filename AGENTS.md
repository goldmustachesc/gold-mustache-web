# Gold Mustache - AI Development Guidelines

## Overview

Diretrizes globais para agentes e IA neste repositório. Detalhes por contexto ficam em `.cursor/rules/*.mdc`; workflows longos em `.cursor/skills/`.

## AI workflow

- **SDD obrigatório**: usar `Subagent-Driven Development (SDD)` em toda tarefa deste projeto.
- Sempre avaliar primeiro como aplicar `SDD`, incluindo decomposição do trabalho, uso de agentes especializados, paralelização, validação e checkpoints.
- Mesmo em tarefas simples, aplicar a mentalidade de `SDD`; quando não houver delegação útil, seguir execução direta sem abandonar esse método.
- `SDD` complementa `TDD`, testes, validação final e as demais regras do projeto. Nunca usar `SDD` para pular verificação, revisão de impacto ou controles de qualidade.

## Repository structure

- `src/app` — Next.js App Router, layouts, route handlers
- `src/components/ui` — primitivos; `src/components/custom` — widgets específicos
- `src/hooks`, `src/utils`, `src/lib`, `src/services` — lógica compartilhada e integrações
- `src/config`, `src/constants`, `src/types` — config e contratos; `public/` — assets
- Imports com alias `@/` (ver `tsconfig.json`)

## Brand and visual identity

Antes de mudanças visuais, consulte `docs/Brand_Book_Gold_Mustache.md`, tokens em `src/app/globals.css` e `src/config/barbershop.ts`. Light/Dark obrigatório. Regras de UI em `.cursor/rules/frontend-components.mdc`.

## Commands

| Comando | Uso |
|---------|-----|
| `pnpm install` | Dependências; manter lockfile commitado |
| `pnpm dev` | Dev local (Turbopack), `http://localhost:3001` |
| `pnpm build` | Build de produção |
| `pnpm start` | Servir build compilado |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm test:gate` | Lint + test + coverage — antes de PR |

## Coding conventions

- TypeScript em `.ts`/`.tsx`; componentes PascalCase, hooks `use*`, utils camelCase
- Biome: 2 espaços, import sorting (`biome.json`)
- UI: Tailwind; `clsx`/`tailwind-merge` para condicionais
- Data-fetching em `src/services` ou server components; config tipada em `src/config`

## Quality principles

- Clean Code, SOLID, KISS, YAGNI
- **Sem `any`** — tipos explícitos, `unknown` com narrowing, generics
- **TDD obrigatório** para código novo e mudanças significativas: RED → GREEN → REFACTOR (`pnpm test` em cada fase)
- Código testável: dependências injetáveis, separação negócio/infra
- Decisões arquiteturais: explicar em PR ou resposta ao revisor, não em comentários no código
- Evitar comentários desnecessários no código; preferir nomes e estrutura claros

## Commits and PRs

- Conventional Commits (Commitlint); `pnpm commit` (Commitizen). Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Assunto com até 72 caracteres, imperativo, sem ponto final
- PR: resumo, issue linkada, screenshots se UI, verificação manual ou gaps

## Specs and complex features

Para features complexas, use `.kiro/specs/[feature]/` com `requirements.md`, `design.md`, `tasks.md` e templates em `.kiro/SPECIFICATION_TEMPLATE.md`, `.kiro/DESIGN_TEMPLATE.md`, `.kiro/TASKS_TEMPLATE.md` (conteúdo preferencialmente em português).

## MCP (ferramentas externas)

Servidores MCP versionados: `.cursor/mcp.json`. Segredos e integrações pessoais: `~/.cursor/mcp.json`. Ver `.cursor/README.md`.

## Claude Code

Para usar com Claude Code, consulte `CLAUDE.md` e `.claude/`.

Cursor continua como ambiente principal; Claude é uma camada de compatibilidade.

Novas diretrizes entram primeiro em `AGENTS.md` e `.cursor/rules/`; depois são espelhadas para Claude, se necessário.
