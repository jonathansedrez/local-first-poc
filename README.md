# local-first-poc

A proof of concept for a local-first architecture using PGlite as an in-browser database and an outbox pattern to sync changes to a backend.

## Structure

```
local-first-poc/
├── frontend/   React + MobX + PGlite
└── backend/    Node + Express REST API
```

## Architecture

### Core idea

The user always writes to a local PGlite database first. The UI updates immediately from local state — no server round-trip on user actions. A background sync process drains the outbox to the backend when connectivity allows.

```
User action
    │
    ▼
PGlite (in-browser)
    ├── todos table       ← source of truth for UI
    └── outbox table      ← queue of pending changes
         │
         ▼ OutboxQueue.process()
    Backend REST API
         │
         ▼
    In-memory store (Express)
```

### Outbox pattern

Every write (insert, update, delete) is recorded in the `outbox` table alongside the actual data change. The `OutboxQueue` processes entries sequentially, oldest first, and sends them to the backend via REST.

On failure, entries are retried with exponential backoff (`2^retryCount` seconds). After 5 failed attempts the entry is marked as `dead`.

| Status | Meaning |
|---|---|
| `pending` | Waiting to be sent |
| `sending` | Request in flight |
| `dead` | Max retries exceeded |

### Sync triggers

`OutboxQueue.process()` is called:
- After every user action (post-enqueue)
- On app startup (drains entries from previous session)
- When the browser comes back online (`window online` event)
- Every 5 seconds via `setInterval` (picks up entries whose `retry_after` has elapsed)

## Getting started

**Backend**
```bash
cd backend && pnpm dev
```

**Frontend**
```bash
cd frontend && pnpm dev
```

## Debugging

`db` and `outboxQueue` are exposed on `window` for browser console access:

```js
await db.query("SELECT * FROM todos")
await db.query("SELECT * FROM outbox")
await outboxQueue.process("http://localhost:3000")
```
