# Type Organisation Design

**Date:** 2026-06-28
**Scope:** `apps/client` and `apps/server` — no shared package

## Problem

Types and interfaces are scattered across hook files and component files. Some are exported from places they shouldn't be (e.g. `AgoraState` from `useAgora.ts`, `AwarenessUser` from `useAwareness.ts`, `WorkspaceTabsProps` from `WorkspaceTabs.tsx`). The two apps keep separate `types.ts` files with no clear rule about what belongs in them.

## Goals

- One clear rule per file: types that are used across multiple files go in a types file; types that are only used in one file stay there, unexported.
- Split types by concern within each app (API contracts vs. domain/runtime types).
- Remove exported interfaces from hook and component files.
- Preserve existing import paths via barrel `index.ts` in each types directory.

## Non-goals

- A shared package between client and server.
- Moving `LanguageId` to the server (server uses raw strings via `normalizeExecutionLanguage`; not worth the coupling).

---

## Client — `apps/client/src/types/`

### `api.ts`
Types that mirror HTTP API response contracts:

```ts
PendingKnock       // { requestId, displayName }
PingResponse       // { isHost, pendingKnocks? }
JoinResponse       // { status: 'admitted'; userId } | { requestId }
JoinStatusResponse // { status: 'pending' | 'denied' } | { status: 'admitted'; userId }
ExecuteResponse    // { stdout, stderr, exitCode }
```

### `room.ts`
Runtime and collaboration types used across multiple files:

```ts
LanguageId       // 'javascript' | 'typescript' | 'python' | 'go'
ExecutionOutput  // { status, stdout, stderr, exitCode, language?, ranBy?, ranAt?, error? }
AwarenessUser    // { userId, name, displayName, color, colorLight }
AgoraState       // { localVideoTrack, localAudioTrack, remoteUsers, cameraOn, micOn, toggleCamera, toggleMic }
```

### `index.ts`
Re-exports everything from `api.ts` and `room.ts`. All existing `from '../types'` imports continue to work unchanged.

### What stays local and unexported

| Type | File | Reason |
|------|------|--------|
| `WorkspaceTabsProps` | `WorkspaceTabs.tsx` | Only used inside that file |
| `EditorPanelProps` | `EditorPanel.tsx` | Only used inside that file |
| `Mode`, `JoinPhase` | `HomePage.tsx` | Page-local state types |

The old `apps/client/src/types.ts` is deleted; all its contents move into `types/api.ts` or `types/room.ts`.

---

## Server — `apps/server/src/types/`

### `room.ts`
Domain and storage types (moved from `src/types.ts`):

```ts
Participant   // { userId, displayName, joinedAt, lastSeen }
KnockRequest  // { requestId, displayName, status, userId, createdAt }
Room          // { roomId, hostSecret, hostUserId, participants, knockRequests, createdAt, lastActiveAt }
```

### `board.ts`
Board-specific types (moved out of `boardStore.ts` and `boardSync.ts`):

```ts
BoardSessionMeta   // { userId }
BoardSyncRequest   // { roomId, userId, sessionId }
```

### `index.ts`
Re-exports from `room.ts` and `board.ts`. All existing `from './types.js'` imports continue to work unchanged.

### What stays local and unexported

| Type | File | Reason |
|------|------|--------|
| `ExecuteRequest` | `roomApi.ts` | Piston integration detail |
| `PistonResponse` | `roomApi.ts` | Piston integration detail |

The old `apps/server/src/types.ts` is deleted; all its contents move into `types/room.ts`.

---

## Migration steps

1. Create `apps/client/src/types/api.ts` with API contract types from the old `types.ts`.
2. Create `apps/client/src/types/room.ts` with runtime types from the old `types.ts` plus `AwarenessUser` (from `useAwareness.ts`) and `AgoraState` (from `useAgora.ts`).
3. Create `apps/client/src/types/index.ts` as barrel.
4. Delete `apps/client/src/types.ts`.
5. Update `useAwareness.ts` — remove `AwarenessUser` interface, import from `../../types`.
6. Update `useAgora.ts` — remove `AgoraState` interface, import from `../../types`.
7. Update `WorkspaceTabs.tsx` — remove `export` from `WorkspaceTabsProps`.
8. Create `apps/server/src/types/room.ts` with contents of old `types.ts`.
9. Create `apps/server/src/types/board.ts` with `BoardSessionMeta` and `BoardSyncRequest`.
10. Create `apps/server/src/types/index.ts` as barrel.
11. Delete `apps/server/src/types.ts`.
12. Update `boardStore.ts` — remove `BoardSessionMeta`, import from `./types.js`.
13. Update `boardSync.ts` — remove `BoardSyncRequest`, import from `./types.js`.
14. Verify all imports resolve; run tests.
