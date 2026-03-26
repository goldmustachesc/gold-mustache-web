# Server Actions vs API Routes

Decision guide for choosing between Next.js Server Actions and API Route Handlers.

## When to Use Server Actions

Use Server Actions (`"use server"`) when **all** of these conditions are true:

- The mutation is called **only by the app's own components** (no external consumers)
- Authentication is **session-based** (Supabase cookies)
- No **custom rate limiting** is needed
- The operation is a **simple mutation** (create, update, delete) without complex orchestration

### Benefits

- No HTTP endpoint to create or maintain
- Built-in CSRF protection (replaces `requireValidOrigin`)
- End-to-end TypeScript types between server and client
- Smaller client bundle (no fetch boilerplate)

### Current Server Actions

| Action | File | Replaces |
|--------|------|----------|
| `markNotificationAsRead` | `src/actions/notifications.ts` | `PATCH /api/notifications/[id]/read` |
| `markAllNotificationsAsRead` | `src/actions/notifications.ts` | `PATCH /api/notifications/mark-all-read` |

## When to Keep API Routes

Use API Route Handlers (`src/app/api/`) when **any** of these conditions apply:

- Endpoint is **public** or consumed by external clients (mobile apps, third-party integrations)
- Uses **token-based auth** (e.g., guest endpoints with `x-guest-token`)
- Needs **custom rate limiting** (e.g., consent API)
- Called by **cron jobs** or **webhooks** (Vercel Cron, Stripe, etc.)
- Involves **complex orchestration** (concurrency locks, multi-service coordination)
- Supports **anonymous users** without a session

## Implementation Pattern

### File Organization

```
src/actions/           # Server Action files ("use server")
  notifications.ts
  [feature].ts

src/lib/actions/       # Shared infrastructure
  safe-action.ts       # createSafeAction wrapper (auth + validation + error handling)
  types.ts             # ActionResult<T> type
```

### Creating a New Server Action

```typescript
// src/actions/[feature].ts
"use server";

import { createSafeAction } from "@/lib/actions/safe-action";
import { actionSuccess } from "@/lib/actions/types";
import { someSchema } from "@/lib/validations/[feature]";

export const myAction = createSafeAction({
  schema: someSchema,            // optional Zod schema for input validation
  handler: async (input, ctx) => {
    // ctx.userId is the authenticated user's ID
    await doSomething(input, ctx.userId);
    return actionSuccess();      // or actionSuccess(data) to return data
  },
});
```

### Consuming in a Client Component

```typescript
import { myAction } from "@/actions/[feature]";

const result = await myAction(input);
if (!result.success) {
  // result.error contains the message, result.code contains the error code
  console.error(result.error);
  return;
}
// result.data contains the typed response (if any)
```

## Migration Candidates (Deferred)

These routes are candidates for future migration when their consuming components are refactored:

| Route | Reason for Deferral |
|-------|---------------------|
| `PUT /api/profile/me` | Multiple consumers (`ProfileForm`, `ChatProfileUpdateForm`) |
| `PUT /api/barbers/me/working-hours` | Medium complexity, Prisma transaction |

### Do NOT Migrate

| Route | Reason |
|-------|--------|
| `POST /api/consent` | Anonymous users + rate limiting |
| `GET /api/slots`, `GET /api/services`, `GET /api/barbers` | Public endpoints |
| Guest endpoints (`x-guest-token`) | Token-based auth |
| Cron endpoints | External callers |
| `POST /api/appointments` | Complex orchestration with concurrency locks |
