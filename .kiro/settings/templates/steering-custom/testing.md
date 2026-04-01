# Testing Standards

Use this steering file for test structure, scope, and verification expectations across the codebase.

## Philosophy
- TDD is mandatory for new behavior and meaningful fixes.
- Test behavior and contracts, not implementation trivia.
- Prefer fast, deterministic tests that preserve confidence during refactors.
- Add tests where they materially reduce regression risk; avoid low-value noise.

## Tooling

- **Runner**: Vitest
- **UI assertions**: Testing Library
- **Property tests**: `fast-check` when domain rules benefit from input coverage
- **Verification baseline**: `pnpm test`, with `pnpm test:gate` as the broader readiness check

## Organization

- Tests usually live close to the owning layer in `__tests__/` folders.
- Co-located tests are acceptable when they improve readability for a focused module.
- Route handlers, services, hooks, UI components, and shared libs already follow this near-owner pattern; continue it by default.

## Naming

- Use `*.test.ts` / `*.test.tsx` as the default naming style.
- Use more specific suffixes when it improves intent, such as route-oriented or property-oriented test names.
- Describe observable behavior in the test name.

## Test Types

- **Unit tests**: pure utilities, validators, isolated domain rules
- **Integration tests**: services, route handlers, auth helpers, multi-step logic
- **UI behavior tests**: rendering, interactions, accessibility-relevant states
- **Property tests**: deterministic rules with combinatorial inputs such as scheduling, serialization, or calculations

## Mocking Guidance

- Mock external boundaries, not the system under test.
- Prefer simple fixtures and factories over oversized scenario setup.
- Keep auth, Prisma, and external service mocks focused on the contract needed by the test.

## Verification Expectations

- New tests should fail first during the RED phase.
- A change is not considered done until relevant tests pass and no regressions remain.
- When a change affects broad runtime behavior, verify beyond the nearest unit test with the most appropriate project script.

## Coverage Guidance

- Coverage matters most on core business paths, auth boundaries, and API/services with regression history.
- Use the existing scoped coverage scripts when a feature targets a specific layer such as app API, services, or integrations.

---
_Focus on project testing patterns and verification discipline, not a generic testing taxonomy._
