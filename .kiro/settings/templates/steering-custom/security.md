# Security Standards

Use this steering file for secure-by-default development decisions across the app.

## Philosophy
- Defense in depth
- Least privilege
- Validate at boundaries
- Fail closed on sensitive operations

## Input Validation

- Validate external input at route, action, and form boundaries.
- Prefer typed schemas and explicit allow-lists over permissive parsing.
- Sanitize or escape according to the output context rather than with generic string transforms.

## Authentication and Authorization

- Reuse the shared Supabase-backed auth/session helpers.
- Enforce authorization on the server for protected data and mutations.
- Treat admin, barber, and self-service access as distinct security contexts.
- Do not rely on client-side role checks for protection.

## Sensitive Data

- Collect and expose only the fields required by the use case.
- Avoid returning internal identifiers or sensitive state unless the consumer truly needs them.
- Redact sensitive values from logs and error payloads.

## Secrets and Configuration

- Never commit secrets or copy live environment values into repository files.
- Assume credentials come from environment/config providers outside version control.
- Validate required configuration at startup or first-use boundaries with safe failures.

## Protected Operations

- Profile deletion/export, loyalty adjustments, financial/admin actions, and scheduling mutations should be treated as sensitive by default.
- Re-check auth and authorization for protected operations even when the surrounding UI is already protected.
- Prefer explicit permission helpers over scattered inline authorization logic.

## Third-Party and Infrastructure Surfaces

- Review security impact when adding new external services, cron routines, webhooks, or background cleanup tasks.
- Limit access scope and store only the minimum configuration needed.
- Add rate limiting or abuse controls when an endpoint can be automated or publicly called.

## Logging and Auditability

- Log denied access, unexpected failures, and high-impact state changes with minimal safe context.
- Never log tokens, secrets, raw passwords, or full sensitive payloads.

---
_Focus on recurring secure development patterns for this codebase, not provider-specific dashboard settings or secret values._
