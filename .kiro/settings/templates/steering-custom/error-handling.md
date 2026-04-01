# Error Handling Standards

Use this steering file for consistent error modeling across route handlers, services, server actions, and UI feedback.

## Philosophy
- Fail early on invalid input.
- Keep user-facing messages understandable and safe.
- Normalize known failures close to the boundary that exposes them.
- Unknown errors should be logged and converted to stable internal-error responses.

## Error Categories

- **Validation errors**: malformed or incomplete input
- **Authorization errors**: unauthenticated or forbidden operations
- **Business-rule errors**: valid input, invalid domain state or transition
- **Infrastructure/external errors**: database, network, third-party, or unexpected failures

## Canonical API Patterns

Prefer the existing shared response helpers and error mapping utilities.

Current API error style:

```json
{
  "error": "ERROR_CODE",
  "message": "Mensagem legível",
  "details": {}
}
```

Guidelines:
- keep `error` stable and machine-readable
- keep `message` safe for client consumption
- include `details` only when it improves recovery or field-level feedback

## Conversion Boundaries

- Route handlers: convert domain and validation failures into HTTP responses
- Server actions: convert failures into typed action results
- Services: express business failures clearly; avoid leaking transport concerns into domain code
- Unknown errors: log and map to a generic internal failure

## Logging

- Log enough context to debug the failure path
- Never log secrets, tokens, full sensitive payloads, or avoidable PII
- Prefer structured context over noisy console dumps

## User Experience

- Validation and business-rule errors should guide recovery when possible
- Forbidden and unauthorized messages should not leak sensitive system state
- UI feedback should stay consistent across forms, dashboards, and protected flows

## Retry and Recovery

- Retry only idempotent or clearly recoverable operations
- Do not retry validation or domain-rule failures
- If a feature depends on external services, design the fallback behavior explicitly instead of retrying blindly

---
_Focus on repeatable error patterns and conversion points already used in the project, not a theoretical universal error framework._
