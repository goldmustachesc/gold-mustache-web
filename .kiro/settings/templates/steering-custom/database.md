# Database Standards

Use this steering file for Prisma- and PostgreSQL-oriented data decisions in the project.

## Philosophy
- Model the barbershop domain first; optimize after correctness and clarity.
- Keep application rules explicit in services, but enforce invariants in the database whenever practical.
- Extend existing schema patterns before inventing a new persistence style.

## Schema Conventions

- Prisma models use PascalCase singular names.
- Database tables and columns should remain compatible with the existing snake_case mapping style when interacting with Postgres.
- Common timestamp fields follow the `createdAt` / `updatedAt` application pattern and may map to `created_at` / `updated_at` in the database.
- Prefer explicit foreign keys and meaningful unique constraints for domain rules.

## Access Pattern

- Prisma is the default data-access layer for application data.
- Shared Prisma access should go through the project singleton (`src/lib/prisma.ts`).
- Prefer typed Prisma queries over raw SQL unless performance or unsupported features justify otherwise.

## Query Design

- Query only the fields needed by the caller.
- Use `select`/`include` intentionally; avoid accidental over-fetching.
- Prevent N+1 behavior in service code by shaping queries around the full business use case.
- Keep data access close to services or dedicated server-side helpers, not UI components.

## Transactions and Consistency

- Use Prisma transactions when a workflow mutates multiple records that must stay consistent.
- Keep transaction scope focused and business-driven.
- Document state-transition invariants in the service/design layer when a feature depends on them.

## Migrations

- Schema changes should be incremental, reviewable, and safe for deployment.
- Prefer small migrations tied to a single feature or concern.
- Verify migration status with the existing project scripts before rollout.
- Brownfield rule: avoid destructive migrations unless the rollout strategy is explicit and reversible.

## Integrity and Validation

- Use database constraints for canonical invariants such as uniqueness, foreign keys, and non-nullability.
- Use Zod or typed boundary validation in the app layer for request/form validation.
- Treat DB constraints and application validation as complementary, not interchangeable.

## Performance Guidance

- Add indexes only when query patterns justify them.
- Watch for queries that combine filtering, ordering, and pagination over frequently accessed operational data.
- Prefer measuring real bottlenecks before introducing raw SQL or caching.

---
_Focus on persistent schema and query patterns that recur across features, not environment-specific connection details._
