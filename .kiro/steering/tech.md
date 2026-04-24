# Technology Stack

## Architecture

This repository is a Next.js App Router application with a layered, domain-aware structure. Route handlers, pages, and UI compose behavior at the edges, while reusable business rules and server-side helpers are concentrated in services and focused library modules.

## Core Technologies

- **Language**: TypeScript with strict typing
- **Framework**: Next.js 15 App Router with React 19
- **Styling**: Tailwind CSS 4 with design tokens in global styles and Radix/shadcn-style primitives
- **Data access**: Prisma 6 against PostgreSQL-compatible storage
- **Auth/session**: Supabase SSR and Supabase JS clients
- **Validation**: Zod at boundaries
- **Client data workflows**: TanStack Query and React Hook Form where appropriate
- **Testing**: Vitest, Testing Library, and targeted property tests with `fast-check`

## Development Standards

### Type Safety
- TypeScript is mandatory for new code.
- `any` is forbidden; prefer explicit types, `unknown` with narrowing, generics, and utility types.
- Shared contracts should stay focused and readable.

### Code Quality
- Biome is the formatter/linter.
- Imports use the `@/` alias for application code under `src/`.
- Favor clear code and stable helpers over speculative abstractions.

### Testing
- TDD is expected for new behavior and meaningful fixes.
- Focused test execution is preferred during development; broader verification is used when scope justifies it.
- `pnpm test:gate` is the main pre-review quality bar when changes have meaningful surface area.

## Common Technical Patterns

- Thin route handlers and boundary modules
- Reusable domain logic in `src/services` and focused helpers in `src/lib`
- Shared API response helpers and auth guards to keep server behavior consistent
- Locale-aware routing and content structure through the App Router
- Theme tokens and brand rules applied centrally, not ad hoc in each component

## Runtime and Tooling Notes

- `pnpm` is the package/script workflow
- Local development runs on port `3001`
- The repository already includes scoped coverage scripts, commit hooks, and formatting checks
- Changes that affect database behavior should align with the existing Prisma migration workflow

---
_Document the stack and decision-shaping conventions that repeat across features, not every package or script in the repository._
