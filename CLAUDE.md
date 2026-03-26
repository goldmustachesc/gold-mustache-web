# Gold Mustache - Claude Code Guidelines

## Project

Next.js 15 App Router + Prisma + Supabase + Tailwind. Barbearia com agendamento, fidelidade e admin.

## Structure

- `src/app` — App Router, layouts, route handlers
- `src/components/ui` — primitivos; `src/components/custom` — widgets
- `src/hooks`, `src/utils`, `src/lib`, `src/services` — lógica compartilhada
- `src/config`, `src/constants`, `src/types` — config e contratos
- Imports: alias `@/`

## Commands

- `pnpm dev` — dev server (`http://localhost:3001`)
- `pnpm test` — Vitest
- `pnpm lint` — Biome
- `pnpm build` — production build
- `pnpm test:gate` — lint + test + coverage (rodar antes de PR)

## Principles

- TypeScript obrigatório; proibido `any`
- TDD: RED → GREEN → REFACTOR
- Clean Code, SOLID, KISS, YAGNI
- Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.)

## Brand

Consultar `docs/Brand_Book_Gold_Mustache.md` antes de mudanças visuais.
Tokens em `src/app/globals.css`. Light/Dark mode obrigatório.

## Specs

Features complexas: `.kiro/specs/[feature]/` com `requirements.md`, `design.md`, `tasks.md`.

## Security

- Nunca commitar secrets
- Não ler `.env`, `.env.*`, `secrets/`
- Validar auth antes de operações sensíveis
