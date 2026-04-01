# Technology Stack

## Architecture

This project is a Next.js App Router application with a layered, domain-aware structure. UI concerns live close to route and component boundaries, while reusable business logic is concentrated in `src/services`, `src/lib`, and typed validation/config modules.

## Core Technologies

- **Language**: TypeScript
- **Framework**: Next.js App Router with React 19
- **Runtime**: Node.js-compatible local and CI workflows managed with `pnpm`

## Key Libraries

- **Prisma**: relational data access and schema management
- **Supabase (`@supabase/ssr`, `@supabase/supabase-js`)**: authentication and session-aware integrations
- **Tailwind CSS 4 + Radix UI primitives**: styling and interaction foundation
- **Zod**: boundary validation for APIs, actions, and form input
- **React Hook Form + TanStack Query**: client-side form and data workflow support
- **Upstash Redis / Ratelimit**: infrastructure support where caching and rate-limiting are needed

## Development Standards

### Type Safety
- TypeScript is mandatory for new code.
- `any` is forbidden; prefer explicit types, `unknown` with narrowing, generics, and utility types.
- Public contracts should stay small, readable, and stable across layers.

### Code Quality
- Biome is the formatter and linter (`pnpm lint`, `pnpm format`).
- Imports use the `@/` alias for app code rooted in `src/`.
- Prefer readable, self-explanatory code over comments or clever abstractions.

### Testing
- Vitest is the test runner; Testing Library is used for UI behavior.
- TDD is mandatory for new behavior and meaningful fixes.
- `pnpm test:gate` is the standard pre-PR verification path.
- Property tests with `fast-check` are appropriate for deterministic core rules and utilities.

## Development Environment

### Required Tools
- `pnpm` for package and script execution
- Prisma CLI via project scripts for schema and migration workflows
- A local environment compatible with the repository bootstrap scripts (`scripts/ensure-worktree-env.cjs`)

### Common Commands
```bash
# Dev
pnpm dev

# Lint / format
pnpm lint
pnpm format

# Tests
pnpm test
pnpm test:watch
pnpm test:gate

# Build
pnpm build

# Database
pnpm db:migrate:status
pnpm db:migrate:deploy
```

## Key Technical Decisions

- Keep route handlers and page-level modules thin; move reusable business rules into services or focused library modules.
- Prefer typed helpers for API responses, auth gates, and server actions so behavior stays consistent across domains.
- Treat Prisma and Supabase as complementary: Prisma owns application data access patterns, while Supabase provides auth/session infrastructure.
- Optimize for brownfield extension: new work should preserve existing boundaries before introducing new architectural layers.

---
_Document standards and high-signal patterns that influence implementation decisions, not every dependency in `package.json`._
