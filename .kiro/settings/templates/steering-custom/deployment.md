# Deployment Standards

Use this steering file for release safety, build verification, and deployment-aware implementation decisions.

## Philosophy
- Every release must be buildable, testable, and reversible.
- Verification happens before and after deployment, not only during coding.
- Deployment-safe changes are preferred over “big bang” rollouts.

## Environments

- **Development**: fast local iteration with `pnpm dev`
- **Staging**: integration validation for the staging branch and pre-release confidence
- **Production**: monitored environment with stricter rollout expectations

## Verification Baseline

- Run targeted local verification during development.
- Use `pnpm test:gate` as the standard readiness bar before PR/review.
- When a change affects builds, routes, or infrastructure assumptions, also verify `pnpm build`.

## Build and Release Flow

```text
Implement -> lint/test -> coverage gate -> build when relevant -> review -> deploy -> verify
```

Principles:
- Fail fast on lint, tests, and coverage regressions.
- Keep lockfiles and generated artifacts consistent with the repo state.
- Treat release verification as part of the work, not a separate concern.

## Database and Release Safety

- Prefer backwards-compatible schema changes.
- Separate “schema exists” from “feature depends on new schema” when rollout risk is non-trivial.
- Verify migration status with project scripts before deployment-sensitive changes.

## Configuration and Secrets

- Never commit secrets or environment values.
- Assume deploy environments provide required variables out of band.
- Code should fail clearly when mandatory configuration is missing.

## Operational Guidance

- Prefer incremental changes over wide refactors when touching auth, billing-like flows, admin operations, or scheduling rules.
- If a change affects cron jobs, background cleanup, rate limits, or protected areas, include explicit verification notes in the spec/design or review summary.
- Post-deploy checks should confirm the user-facing path or API path touched by the change, not only generic health.

---
_Focus on deployment-safe engineering habits and rollout constraints rather than provider-specific dashboards or CLI steps._
