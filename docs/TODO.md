# TODO — Pending Improvements

## Task 007 — Admin Redemption Management (Code Review)

- [x] **Extract `RedemptionStatusBadge` component** — Status badge styling is duplicated in `RedemptionsTab.tsx` (validation card and table rows). Extract a small shared component to DRY this up. File: `src/components/admin/RedemptionsTab.tsx`

- [x] **Separate rate-limit commit** — Already committed in `69f433d`. Splitting retroactively would require force push; not worth the risk. Noted for future commit discipline.
