# API Standards

Use this steering file for project-wide API patterns in Next.js route handlers and server-side boundaries.

## Philosophy
- Prefer route handlers only when an HTTP boundary is actually needed; for same-app mutations, consider server actions first.
- Keep handlers thin: auth, validation, orchestration, and response mapping belong here; business rules belong in services/lib modules.
- Be explicit in contracts and predictable in error handling.
- Secure sensitive endpoints before business logic runs.

## Endpoint Pattern

- API routes live under `src/app/api/**/route.ts`.
- Use resource-oriented, domain-readable paths without speculative versioning by default.
- Prefer nouns and domain segments over generic verbs.

Examples:
- `/api/appointments`
- `/api/appointments/[id]/cancel`
- `/api/admin/barbers/[id]/working-hours`
- `/api/loyalty/referral/apply`

## HTTP Methods

- `GET`: reads and safe queries
- `POST`: creation or explicit domain actions
- `PATCH`/`PUT`: updates when idempotent semantics are clear
- `DELETE`: removals or explicit delete workflows

Choose the method that matches domain intent instead of forcing CRUD semantics where an action route is clearer.

## Validation and Input Boundaries

- Validate request bodies, params, and query input near the boundary, preferably with Zod.
- Reject invalid input early with stable error codes/messages.
- Keep parsing/normalization out of page components when the same logic is reused by handlers or actions.

## Response Shape

Prefer the shared helpers from `src/lib/api/response.ts`:

```typescript
apiSuccess(data);
apiCollection(data, meta);
apiMessage(message);
apiError(code, message, status, details?);
```

Patterns:
- Success payloads usually return `{ data }`
- Collection endpoints may return `{ data, meta }`
- Mutation-only endpoints may return `{ success: true, message? }`
- Errors return `{ error, message, details? }`

## Status Codes

- `200`/`201`: successful reads or writes with payload
- `204` or `200` with `apiMessage()`: successful mutation without meaningful data body
- `400`: validation or business-rule failure
- `401`: unauthenticated
- `403`: authenticated but not allowed
- `404`: missing resource
- `409`: conflict or invalid state transition when that distinction matters
- `500`: unexpected server failure

## Authentication and Authorization

- Use server-side Supabase session checks for authenticated routes.
- Reuse focused guards/helpers for role-based access such as admin/barber protections.
- UI checks are advisory only; authorization must happen on the server boundary or service layer.

## Pagination and Filtering

- Introduce pagination only when collection size or UX requires it.
- When paginating, return typed metadata in `meta`.
- Prefer explicit query params over overloaded filter blobs.

## Compatibility and Evolution

- This is a brownfield app: extend existing response helpers and auth patterns before creating new conventions.
- Avoid introducing public API versioning unless a true external compatibility contract appears.
- Preserve stable response contracts for hooks, pages, and tests already relying on them.

---
_Focus on stable API patterns used across route handlers, not an exhaustive endpoint catalog._
