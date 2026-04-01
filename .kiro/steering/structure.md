# Project Structure

## Organization Philosophy

The codebase uses a layered structure inside `src/`, with domain groupings emerging where complexity justifies them. Entry points live in App Router routes and UI components, while reusable business logic is pushed into services, server-side helpers, validation modules, and typed configuration/contracts.

## Directory Patterns

### App Router Entry Points
**Location**: `src/app/`
**Purpose**: Pages, layouts, route handlers, locale-aware routing, and route groups for public, auth, and protected areas
**Example**: `src/app/[locale]/...` and `src/app/api/**/route.ts`

### UI Layers
**Location**: `src/components/`
**Purpose**: Reusable UI primitives in `ui/`, plus domain-oriented and page-supporting components in feature folders
**Example**: booking, dashboard, loyalty, profile, sections, layout

### Shared Business Logic
**Location**: `src/services/`, `src/lib/`, `src/hooks/`, `src/utils/`
**Purpose**: Business rules, auth/session helpers, API helpers, validation, reusable hooks, and pure utilities
**Example**: booking services, loyalty services, Prisma/Supabase helpers, safe actions, scheduling logic

### Contracts and Configuration
**Location**: `src/config/`, `src/constants/`, `src/types/`
**Purpose**: Typed configuration, shared constants, and cross-layer contracts
**Example**: barbershop config, feature flags, API response types, site and locale configuration

## Routing and Access Patterns

- Locale-aware routes live under `src/app/[locale]/`
- Protected and public areas are separated with route groups
- API handlers live under `src/app/api/`
- Access control is enforced server-side through middleware/proxy, auth helpers, route handlers, and service-level checks where needed

## Naming Conventions

- **Components**: PascalCase
- **Hooks**: `use*`
- **Functions**: camelCase
- **Test files**: `*.test.ts` / `*.test.tsx` by default, often near the owning layer in `__tests__/`
- **Imports**: prefer `@/` for cross-layer imports; use relative imports for nearby siblings when clearer

## Code Organization Principles

- Keep route handlers, pages, and UI modules focused on orchestration and presentation
- Move reusable business rules into services or focused modules under `src/lib`
- Reuse validation schemas and shared helpers at boundaries instead of duplicating logic in pages or components
- Prefer extending an existing domain boundary before creating a new top-level pattern
- Tests usually live near the code they protect, mirroring the owning layer rather than a single global test tree

---
_Document durable structure and boundary rules. New files that follow these patterns should not require steering updates._
