# Repository Guidelines

## Project Structure & Module Organization
- `src/app` hosts the Next.js App Router entry points, layouts, and route handlers.
- UI primitives live in `src/components/ui`; bespoke widgets stay in `src/components/custom` and reuse shared styles.
- Shared logic is split between `src/hooks`, `src/utils`, `src/lib`, and service clients in `src/services` for external APIs like Instagram.
- Configuration, constants, and TypeScript contracts live in `src/config`, `src/constants`, and `src/types`; assets and fonts stay under `public/`.
- Import from the project root using the `@/` alias (see `tsconfig.json`).

## Brand Book & Visual Identity
- **SEMPRE consulte `docs/Brand_Book_Gold_Mustache.md` antes de implementar qualquer mudança visual.**
- O Brand Book define: cores (dourado como primário), tipografia (Playfair Display para títulos, Geist Sans para UI), tom de voz, espaçamentos e componentes visuais.
- Use os design tokens definidos em `src/app/globals.css` (variáveis CSS como `--primary`, `--background`, etc.).
- Configurações centralizadas da marca estão em `src/config/barbershop.ts`.
- Respeite o sistema dual Light/Dark mode com as cores especificadas no Brand Book.
- Tom de voz: direto, caloroso e profissional. Evite linguagem excessivamente informal ou corporativa.

## Build, Test, and Development Commands
- `pnpm install` sets up dependencies; keep lockfile changes committed.
- `pnpm dev` runs the local server with Turbopack at `http://localhost:3001`.
- `pnpm build` validates the production bundle; run before shipping major changes.
- `pnpm start` serves the compiled build for smoke testing production behavior.
- `pnpm lint` runs Biome checks; `pnpm format` applies Biome formatting fixes.

## Coding Style & Naming Conventions
- Biome enforces 2-space indentation, import sorting, and the shared lint rules in `biome.json`.
- Prefer TypeScript everywhere (`.ts`/`.tsx`); keep components PascalCase (`HeroBanner.tsx`), hooks prefixed with `use`, and utilities camelCase.
- Compose UI with Tailwind utility classes; use `clsx`/`tailwind-merge` to manage conditional styles instead of manual string concatenation.
- Keep data-fetching code inside `src/services` or server components, and expose configuration via strongly typed objects in `src/config`.

## Testing Guidelines
- No automated suite exists yet; at minimum run `pnpm lint` and exercise critical paths (landing page, Instagram feed, booking redirect) before opening a PR.
- When introducing tests, colocate specs next to the feature with the `.test.ts(x)` suffix and favor React Testing Library or Playwright for UI flows.
- Document any new fixtures or mocked services in `src/services` to keep API integrations deterministic.

## Commit & Pull Request Guidelines
- Follow Conventional Commits enforced by Commitlint; use `pnpm commit` (Commitizen) for prompts. Allowed types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`, and `revert`.
- Keep subjects under 72 characters, present tense, and skip trailing punctuation.
- Open PRs with a concise summary, linked issue or ticket, screenshots for UI changes, and notes on manual verification or known gaps.
- Ensure the branch is rebased on `main` and that lint/build steps pass in CI before requesting review.
