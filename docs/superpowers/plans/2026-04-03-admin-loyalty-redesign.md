# Admin Loyalty Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Admin Loyalty page into focused tab components with QuickStats, full CRUD on rewards, inline transaction history, and robust filtering/sorting for accounts.

**Architecture:** Break down the monolithic `page.tsx` into independent tab components (`AccountsTab`, `CatalogTab`, etc.), orchestrating them in `AdminLoyaltyPage`. Backend endpoints will be extended/added to support the new data requirements, maintaining Prisma as the ORM.

**Tech Stack:** Next.js App Router, React (Server/Client components), Tailwind CSS, Prisma, TanStack Query (via existing custom hooks), Zod, Vitest.

---

### Task 1: Extend Accounts API Endpoint

**Files:**
- Modify: `src/app/api/admin/loyalty/accounts/route.ts`
- Modify: `src/app/api/admin/loyalty/__tests__/accounts.test.ts` (if it exists, else create it)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/admin/loyalty/__tests__/accounts.test.ts
// Write tests ensuring the endpoint accepts search, tier, sortBy, and sortOrder, and returns lifetimePoints, memberSince, and redemptionCount.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/admin/loyalty/__tests__/accounts.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Update `src/app/api/admin/loyalty/accounts/route.ts` to parse `search`, `tier`, `sortBy`, `sortOrder` from query params.
Update the Prisma query `where` clause to include `profile.fullName` search and `tier` filter.
Update the Prisma query `orderBy` based on `sortBy` and `sortOrder`.
Include `lifetimePoints`, `createdAt`, and `_count: { select: { redemptions: true } }` in the Prisma query.
Map these to `lifetimePoints`, `memberSince`, and `redemptionCount` in the returned DTO.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/admin/loyalty/__tests__/accounts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/loyalty/accounts/route.ts src/app/api/admin/loyalty/__tests__/accounts.test.ts
git commit -m "feat(api): extend admin accounts endpoint with search, filters, sorting and extra fields"
```

### Task 2: Create Account Transactions API Endpoint

**Files:**
- Create: `src/app/api/admin/loyalty/accounts/[accountId]/transactions/route.ts`
- Create: `src/app/api/admin/loyalty/__tests__/account-transactions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test that GET /api/admin/loyalty/accounts/:accountId/transactions returns paginated transactions for the specific account.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/admin/loyalty/__tests__/account-transactions.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Implement `GET` handler in `src/app/api/admin/loyalty/accounts/[accountId]/transactions/route.ts`.
Extract `accountId`, `page`, `limit`.
Use `prisma.pointTransaction.findMany` where `loyaltyAccountId` matches `accountId` or `loyaltyAccount.id`.
Order by `createdAt desc`.
Return paginated response.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/admin/loyalty/__tests__/account-transactions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/loyalty/accounts/[accountId]/transactions/route.ts src/app/api/admin/loyalty/__tests__/account-transactions.test.ts
git commit -m "feat(api): add endpoint for account specific transactions"
```

### Task 3: Update Hooks and Types

**Files:**
- Modify: `src/hooks/useAdminLoyalty.ts`

- [ ] **Step 1: Update Types**

Update `AdminLoyaltyAccount` or create `AdminLoyaltyAccountExtended` with new fields (`lifetimePoints`, `memberSince`, `redemptionCount`).
Define `AccountsParams` for search, tier, sortBy, sortOrder.

- [ ] **Step 2: Update useAdminLoyaltyAccounts**

Add `params?: AccountsParams` to `useAdminLoyaltyAccounts`. Append params to API query string. Include them in queryKey.

- [ ] **Step 3: Create useAdminAccountTransactions and useAdminExpiringPoints**

Create hook `useAdminAccountTransactions(accountId, page, limit, enabled)`.
Create hook `useAdminExpiringPoints()` that calls `/api/admin/loyalty/expiring-points`.

- [ ] **Step 4: Verify TypeScript**

Run: `pnpm tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAdminLoyalty.ts
git commit -m "feat(hooks): update admin loyalty hooks with extended types and new endpoints"
```

### Task 4: Extract AdjustPointsDialog

**Files:**
- Create: `src/components/admin/loyalty/AdjustPointsDialog.tsx`
- Create: `src/components/admin/loyalty/__tests__/AdjustPointsDialog.test.tsx`

- [ ] **Step 1: Write the test**
Test that it renders correctly when open, calls `onClose` when canceled, and handles the `useAdminAdjustPoints` mutation.

- [ ] **Step 2: Run test (fail)**
Expected: FAIL

- [ ] **Step 3: Implementation**
Extract the `Dialog` for point adjustment from `page.tsx` into this new component.

- [ ] **Step 4: Run test (pass)**
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/admin/loyalty/AdjustPointsDialog.tsx src/components/admin/loyalty/__tests__/AdjustPointsDialog.test.tsx
git commit -m "refactor(ui): extract AdjustPointsDialog component"
```

### Task 5: Create QuickStats Component

**Files:**
- Create: `src/components/admin/loyalty/QuickStats.tsx`
- Create: `src/components/admin/loyalty/__tests__/QuickStats.test.tsx`

- [ ] **Step 1: Write the test**
Test that it fetches `useAdminLoyaltyReports` and `useAdminExpiringPoints` and renders 4 KPI cards (using `KpiCard`).

- [ ] **Step 2: Run test (fail)**
Expected: FAIL

- [ ] **Step 3: Implementation**
Implement the component with a grid of 4 `KpiCard`s. Handle loading states gracefully. Add highlighting for the expiring points card if count > 0.

- [ ] **Step 4: Run test (pass)**
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/admin/loyalty/QuickStats.tsx src/components/admin/loyalty/__tests__/QuickStats.test.tsx
git commit -m "feat(ui): create QuickStats component for loyalty admin"
```

### Task 6: Build Accounts Tab Components (Filters & Card)

**Files:**
- Create: `src/components/admin/loyalty/AccountFilters.tsx`
- Create: `src/components/admin/loyalty/AccountCard.tsx`
- Create: `src/components/admin/loyalty/AccountTransactions.tsx`
- Create: `src/components/admin/loyalty/ExpirationAlert.tsx`

- [ ] **Step 1: Implement AccountFilters**
Write component for search input, tier toggle buttons, and sort select. Emit changes via `onChange(filters)`. No tests needed if purely presentational, but add a basic snapshot/render test.

- [ ] **Step 2: Implement AccountTransactions**
Given an `accountId`, use `useAdminAccountTransactions` and render a small list of transactions.

- [ ] **Step 3: Implement AccountCard**
Render mobile card with new fields (member since, resgates). Add accordion/collapsible area for `AccountTransactions`.

- [ ] **Step 4: Implement ExpirationAlert**
Banner if `expiringPointsData.accountCount > 0`.

- [ ] **Step 5: Commit**
```bash
git add src/components/admin/loyalty/
git commit -m "feat(ui): add account filters, card, and transaction components"
```

### Task 7: Build AccountsTab

**Files:**
- Create: `src/components/admin/loyalty/AccountsTab.tsx`

- [ ] **Step 1: Implement AccountsTab**
Manage local state for filters, search (with debounce), pagination. Use `useAdminLoyaltyAccounts`.
Render `AccountFilters`, `ExpirationAlert`, Desktop Table (with sortable headers), and Mobile list (`AccountCard`).
Include `AdjustPointsDialog` and manage `selectedAccount` state.

- [ ] **Step 2: Verify rendering in dev environment or via tests**
Run: `pnpm build`

- [ ] **Step 3: Commit**
```bash
git add src/components/admin/loyalty/AccountsTab.tsx
git commit -m "feat(ui): create AccountsTab component"
```

### Task 8: Build CatalogTab & Refactor RewardModal

**Files:**
- Create: `src/components/admin/loyalty/CatalogTab.tsx`
- Create: `src/components/admin/loyalty/RewardAdminCard.tsx`
- Modify: `src/components/loyalty/RewardModal.tsx`
- Modify: `src/components/loyalty/RewardForm.tsx`

- [ ] **Step 1: Update RewardModal for Editing**
Update `RewardModal.tsx` and `RewardForm.tsx` to support `rewardId` for edit mode (fetching initial data via `useAdminReward` and mutating via `useAdminUpdateReward`).

- [ ] **Step 2: Implement RewardAdminCard**
Card to display a reward with Edit, Delete, and Toggle actions.

- [ ] **Step 3: Implement CatalogTab**
Render the list of rewards. Integrate `RewardAdminCard`. Include a "New Item" button that opens `RewardModal`. Add delete confirmation dialog.

- [ ] **Step 4: Commit**
```bash
git add src/components/admin/loyalty/CatalogTab.tsx src/components/admin/loyalty/RewardAdminCard.tsx src/components/loyalty/RewardModal.tsx src/components/loyalty/RewardForm.tsx
git commit -m "feat(ui): implement CatalogTab with full CRUD for rewards"
```

### Task 9: Assemble AdminLoyaltyPage

**Files:**
- Create: `src/components/admin/loyalty/AdminLoyaltyPage.tsx`
- Modify: `src/app/[locale]/(protected)/admin/loyalty/page.tsx`
- Create: `src/components/admin/loyalty/index.ts`

- [ ] **Step 1: Implement AdminLoyaltyPage**
Orchestrate `QuickStats` and the `Tabs` (`AccountsTab`, `CatalogTab`, `RedemptionsTab`, `ReportsTab`).
Apply `usePrivateHeader`.

- [ ] **Step 2: Replace page.tsx**
In `src/app/[locale]/(protected)/admin/loyalty/page.tsx`, simply render `<AdminLoyaltyPage />`.

- [ ] **Step 3: Run Full Build and Lint**
Run: `pnpm lint` and `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/components/admin/loyalty/AdminLoyaltyPage.tsx src/app/[locale]/(protected)/admin/loyalty/page.tsx src/components/admin/loyalty/index.ts
git commit -m "refactor(ui): replace monolithic admin loyalty page with decomposed components"
```
