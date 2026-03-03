# TODO — Pending Improvements

## Task 007 — Admin Redemption Management (Code Review)

- [ ] **Extract `RedemptionStatusBadge` component** — Status badge styling is duplicated in `RedemptionsTab.tsx` (validation card and table rows). Extract a small shared component to DRY this up. File: `src/components/admin/RedemptionsTab.tsx`

- [ ] **Separate rate-limit commit** — `src/lib/rate-limit.ts` and `src/lib/__tests__/rate-limit.test.ts` changes are unrelated to Task 007. Commit them separately for cleaner git history.
