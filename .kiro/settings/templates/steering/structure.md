# Project Structure

## Organization Philosophy

The repository follows a layered structure inside `src/`, with domain groupings emerging where complexity justifies them. Entry points live in App Router routes and UI components, while reusable domain rules are pushed into services, utilities, validation modules, and config/types packages.

## Directory Patterns

### App Router Entry Points
**Location**: `src/app/`
**Purpose**: Routes, layouts, route handlers, page composition, protected/public segmentation
**Example**: locale-aware pages, protected areas, and `route.ts` handlers under `src/app/api`

### UI Primitives
**Location**: `src/components/ui/`
**Purpose**: Reusable presentation primitives and low-level interaction components without business orchestration
**Example**: buttons, menus, toggles, shared UI wrappers

### Domain / Feature UI
**Location**: `src/components/custom/`, domain folders under `src/components/`
**Purpose**: Feature-facing components that compose primitives into product workflows
**Example**: booking, dashboard, loyalty, feedback, profile, layout sections

### Shared Business Logic
**Location**: `src/services/`, `src/lib/`, `src/hooks/`, `src/utils/`
**Purpose**: Services, server-side helpers, reusable hooks, pure utilities, validation, auth guards, and API helpers
**Example**: booking services, loyalty services, Supabase helpers, response utilities, scheduling rules

### Contracts and Configuration
**Location**: `src/config/`, `src/constants/`, `src/types/`
**Purpose**: Typed configuration, constants, and shared contracts used across domains
**Example**: site config, feature flags, API response types, barbershop-specific settings

## Naming Conventions

- **Files**: prefer descriptive kebab-case or domain-oriented names; React components commonly use PascalCase filenames where already established
- **Components**: PascalCase
- **Hooks**: `use*`
- **Functions**: camelCase
- **Prisma models / shared types**: follow the naming conventions of their owning layer, not UI conventions

## Import Organization

```typescript
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { LocalThing } from "./LocalThing";
```

**Path Aliases**:
- `@/` maps to `src/`
- Prefer alias imports for cross-feature or cross-layer dependencies
- Prefer relative imports only for nearby siblings within the same folder slice

## Code Organization Principles

- Keep route handlers, pages, and components focused on orchestration, rendering, and boundary concerns.
- Put reusable business rules in `src/services` or focused modules under `src/lib`.
- Keep validation near boundaries (`src/lib/validations`, route handlers, safe actions) and reuse schemas when the same contract appears in multiple flows.
- Prefer adding new focused files over bloating already complex modules, but avoid speculative abstractions.
- Tests usually live in `__tests__/` folders near the owning layer, with occasional co-located test files where that reads better.

---
_Document stable structural patterns. If a new file follows these rules, steering should not need an update._
