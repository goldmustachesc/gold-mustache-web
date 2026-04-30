# Gold Mustache - AI Development Guidelines

## Overview

Diretrizes globais para agentes e IA neste repositório. Detalhes por contexto ficam em `.cursor/rules/*.mdc`; workflows longos em `.cursor/skills/`.

## AI workflow

- **SDD escalado por complexidade**: usar `Subagent-Driven Development (SDD)` com cerimônia proporcional ao tier da tarefa (ver `.kiro/TIERS.md`).
- Sempre avaliar o tier antes de executar: Trivial → execução direta, Light → requirements, Full → brainstorm + spec completa.
- Mentalidade SDD sempre ativa (decomposição, delegação, paralelização, checkpoints); cerimônia apenas quando agrega valor.
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

Use Kiro proporcional ao tier (ver `.kiro/TIERS.md`):
- **Trivial**: execução direta, sem spec
- **Light**: `.kiro/specs/[feature]/` com `requirements.md` apenas
- **Full**: `.kiro/specs/[feature]/` com `brainstorm.md` + `requirements.md` + `design.md` + `tasks.md`

A fonte canônica dos templates é `.kiro/settings/templates/specs/`. Os arquivos `.kiro/SPECIFICATION_TEMPLATE.md`, `.kiro/DESIGN_TEMPLATE.md` e `.kiro/TASKS_TEMPLATE.md` são referência legada e não devem divergir dos templates ativos.

## MCP (ferramentas externas)

Servidores MCP versionados: `.cursor/mcp.json`. Segredos e integrações pessoais: `~/.cursor/mcp.json`. Ver `.cursor/README.md`.

## Claude Code

Para usar com Claude Code, consulte `CLAUDE.md` e `.claude/`.

Cursor continua como ambiente principal; Claude é uma camada de compatibilidade.

Novas diretrizes entram primeiro em `AGENTS.md` e `.cursor/rules/`; depois são espelhadas para Claude, se necessário.


# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro/spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Portuguese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Workflows por tier

### Tier Trivial
- Execução direta, sem spec

### Tier Light
- `/kiro/spec-init "descrição"`
- `/kiro/spec-requirements {feature}`
- Implementação direta (sem design.md, sem tasks.md)

### Tier Full
- Phase 0 — Brainstorm (obrigatório): `/kiro/spec-brainstorm "tema"` → gera `brainstorm.md`
- Phase 0b (opcional): `/kiro/steering`, `/kiro/steering-custom`
- Phase 1 — Specification:
  - `/kiro/spec-init "descrição"`
  - `/kiro/spec-requirements {feature}`
  - `/kiro/validate-gap {feature}` (opcional: gap analysis)
  - `/kiro/spec-design {feature} [-y]`
  - `/kiro/validate-design {feature}` (opcional: design review)
  - `/kiro/spec-tasks {feature} [-y]`
- Phase 2 — Implementation: `/kiro/spec-impl {feature} [tasks]`
  - `/kiro/validate-impl {feature}` (opcional: verificação final)
- Progress check: `/kiro/spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro/spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro/steering-custom`)
