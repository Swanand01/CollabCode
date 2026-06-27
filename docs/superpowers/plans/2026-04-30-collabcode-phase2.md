# CollabCode Phase 2 Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collaborative whiteboard to the existing room experience. Users who are admitted to a room can switch between the shared code editor and a shared tldraw board, or view both side-by-side in a resizable split layout.

**Architecture:** Keep the existing Phase 1 architecture for rooms, admission, code editing, and presence. Add a tldraw sync WebSocket endpoint to the existing Node server on `:3000`, using `@tldraw/sync-core` and one `TLSocketRoom` per CollabCode room board. The React client uses `@tldraw/sync`’s `useSync` hook to connect the board to that endpoint. Room API participant state remains the source of authorization.

**Why this approach:** Current tldraw docs recommend `@tldraw/sync` / `@tldraw/sync-core` for multiplayer tldraw over WebSockets. The docs also say custom backends are possible through low-level store APIs, but `@tldraw/sync` handles connection lifecycle, document sync, presence, and conflict handling. Sources:
- https://tldraw.dev/docs/sync
- https://tldraw.dev/reference/sync/useSync
- https://tldraw.dev/reference/sync-core/TLSocketRoom

**Tech Stack Additions:** `tldraw`, `@tldraw/sync`, `@tldraw/sync-core`, `ws`, `allotment`.

**Persistence:** Use `InMemorySyncStorage` first, initialized from and persisted to LevelDB snapshots through `onChange`. This preserves the repo’s zero-config storage approach. A later production hardening task can move tldraw boards to `SQLiteSyncStorage` if needed.

---

## File Map

```
collabcode/
├── apps/
│   ├── server/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                  # switch Express to an http.Server and attach board WS
│   │       ├── boardSync.ts              # tldraw sync WebSocket routing + auth
│   │       ├── boardStore.ts             # TLSocketRoom cache + LevelDB snapshot persistence
│   │       └── roomStore.ts              # existing admitted participant source of truth
│   │   └── tests/
│   │       └── boardSync.test.ts         # auth/unit tests for board room helpers
│   └── client/
│       ├── package.json
│       └── src/
│           ├── components/
│           │   ├── WorkspaceTabs.tsx      # Code / Board tabs and split mode controls
│           │   ├── BoardPanel.tsx         # tldraw board surface
│           │   └── room/
│           │       └── AdmittedRoom.tsx   # compose workspace tabs into existing RoomShell
│           ├── hooks/
│           │   └── useBoardSync.ts        # wrapper around @tldraw/sync useSync
│           ├── lib/
│           │   └── boardAssets.ts         # Phase 2 asset store, starts with inline/base64 guardrails
│           └── tests/
│               ├── WorkspaceTabs.test.tsx
│               └── BoardPanel.test.tsx
└── docs/
    └── superpowers/
        └── plans/2026-04-30-collabcode-phase2.md
```

---

## Task 1: Install Phase 2 Dependencies

**Files:**
- Modify: `apps/client/package.json`
- Modify: `apps/server/package.json`
- Modify: `package-lock.json`

- [x] **Step 1: Install client dependencies**

```bash
npm install tldraw @tldraw/sync allotment -w apps/client
```

- [x] **Step 2: Install server dependencies**

```bash
npm install @tldraw/sync-core ws -w apps/server
npm install -D @types/ws -w apps/server
```

- [x] **Step 3: Verify dependency tree**

```bash
npm ls tldraw @tldraw/sync @tldraw/sync-core ws allotment
```

Expected: all packages resolve, and tldraw client/server package versions are compatible.

- [ ] **Step 4: Commit**

```bash
git add apps/client/package.json apps/server/package.json package-lock.json
git commit -m "feat(deps): add tldraw whiteboard sync dependencies"
```

---

## Task 2: Board Sync Room Store

**Files:**
- Create: `apps/server/src/boardStore.ts`
- Create: `apps/server/tests/boardStore.test.ts`

**Design:**
- Maintain one `TLSocketRoom` instance per CollabCode room board.
- Persist snapshots to LevelDB through `InMemorySyncStorage.onChange`.
- Close and remove inactive board rooms when the last tldraw session leaves.
- Use a separate LevelDB namespace from the Hocuspocus documents.

- [x] **Step 1: Write failing tests**

Test cases:
- Creates one board room per room ID.
- Returns the same `TLSocketRoom` instance for repeated calls.
- Calls persistence callback when board data changes.
- Removes room from cache when `onSessionRemoved` reports zero remaining sessions.

- [x] **Step 2: Implement `boardStore.ts`**

Skeleton:

```ts
import { InMemorySyncStorage, TLSocketRoom, type RoomSnapshot } from '@tldraw/sync-core';
import { Level } from 'level';

const boardDb = new Level<string, RoomSnapshot>('./data/tldraw', { valueEncoding: 'json' });
const rooms = new Map<string, TLSocketRoom>();

export async function getBoardRoom(roomId: string): Promise<TLSocketRoom> {
  const existing = rooms.get(roomId);
  if (existing && !existing.isClosed()) return existing;

  const snapshot = await loadSnapshot(roomId);
  const storage = new InMemorySyncStorage({
    snapshot,
    onChange() {
      void boardDb.put(roomId, storage.getSnapshot());
    },
  });

  const room = new TLSocketRoom({
    storage,
    onSessionRemoved: (_room, { numSessionsRemaining }) => {
      if (numSessionsRemaining === 0) {
        room.close();
        rooms.delete(roomId);
      }
    },
  });

  rooms.set(roomId, room);
  return room;
}

async function loadSnapshot(roomId: string): Promise<RoomSnapshot | undefined> {
  try {
    return await boardDb.get(roomId);
  } catch {
    return undefined;
  }
}

export function _resetBoardRoomsForTests(): void {
  for (const room of rooms.values()) room.close();
  rooms.clear();
}
```

Adjust types against the installed `@tldraw/sync-core` version.

- [x] **Step 3: Run server tests**

```bash
npm test -w apps/server
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/boardStore.ts apps/server/tests/boardStore.test.ts
git commit -m "feat(server): add tldraw board room store"
```

---

## Task 3: Board Sync WebSocket Endpoint

**Files:**
- Create: `apps/server/src/boardSync.ts`
- Modify: `apps/server/src/index.ts`
- Create: `apps/server/tests/boardSync.test.ts`

**Endpoint:**

```text
ws://localhost:3000/rooms/:roomId/board-sync?userId=<admitted-user-id>
```

Notes:
- `@tldraw/sync` may add reserved query params such as `sessionId` and `storeId`.
- The server must validate `roomId` and `userId`.
- Only admitted participants can connect.
- All admitted users are editable in Phase 2.

- [x] **Step 1: Write auth/helper tests**

Test cases:
- Unknown room is rejected.
- Missing `userId` is rejected.
- Non-participant `userId` is rejected.
- Admitted participant is accepted.
- Session ID uses tldraw-provided `sessionId` when present.

- [x] **Step 2: Implement URL parsing and auth helpers**

```ts
export function parseBoardSyncRequest(url: string): {
  roomId: string;
  userId: string;
  sessionId: string;
} | null {
  // Parse /rooms/:roomId/board-sync and query params.
}

export function canJoinBoard(roomId: string, userId: string): boolean {
  const room = store.getRoom(roomId);
  return Boolean(room?.participants.has(userId));
}
```

- [x] **Step 3: Implement WebSocket upgrade handler**

Skeleton:

```ts
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { getBoardRoom } from './boardStore.js';
import * as roomStore from './roomStore.js';

export function attachBoardSync(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const parsed = parseBoardSyncRequest(req.url ?? '');
    if (!parsed || !canJoinBoard(parsed.roomId, parsed.userId)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, async ws => {
      const boardRoom = await getBoardRoom(parsed.roomId);
      boardRoom.handleSocketConnect({
        sessionId: parsed.sessionId,
        socket: ws,
        isReadonly: false,
        meta: { userId: parsed.userId },
      });
    });
  });
}
```

Adjust `TLSocketRoom` generic/session metadata types against installed package types.

- [x] **Step 4: Switch `index.ts` to an HTTP server**

Current:

```ts
app.listen(PORT, () => {
  console.log(`Room API listening on http://localhost:${PORT}`);
});
```

Target:

```ts
import { createServer } from 'node:http';
import { attachBoardSync } from './boardSync.js';

const httpServer = createServer(app);
attachBoardSync(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Room API listening on http://localhost:${PORT}`);
  console.log(`Board sync listening on ws://localhost:${PORT}/rooms/:roomId/board-sync`);
});
```

- [x] **Step 5: Run server tests and TypeScript**

```bash
npm test -w apps/server
npx tsc --noEmit -w apps/server
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/boardSync.ts apps/server/src/index.ts apps/server/tests/boardSync.test.ts
git commit -m "feat(server): add tldraw board sync websocket"
```

---

## Task 4: Board Sync Client Hook

**Files:**
- Create: `apps/client/src/hooks/useBoardSync.ts`
- Create: `apps/client/src/lib/boardAssets.ts`

**Design:**
- Wrap `@tldraw/sync`’s `useSync`.
- Use existing admitted `roomId`, `userId`, `displayName`, and deterministic user color.
- Point to the Room API server, not Hocuspocus.
- Keep asset handling basic for Phase 2. Use inline/base64 only as a prototype path, and document that production asset upload belongs in a later hardening task.

- [x] **Step 1: Implement `boardAssets.ts`**

Use tldraw’s asset store types from installed `tldraw`.

```ts
import type { TLAssetStore } from 'tldraw';

export const boardAssetStore: TLAssetStore = {
  async upload(_asset, file) {
    // Phase 2 prototype. Reject large files to avoid huge inline sync payloads.
    if (file.size > 1_000_000) {
      throw new Error('Files over 1MB are not supported yet.');
    }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ src: String(reader.result) });
      reader.readAsDataURL(file);
    });
  },
  resolve(asset) {
    return asset.props.src;
  },
};
```

- [x] **Step 2: Implement `useBoardSync.ts`**

```ts
import { useSync } from '@tldraw/sync';
import { colorForUserId } from '../lib/colors';
import { boardAssetStore } from '../lib/boardAssets';

export function useBoardSync(roomId: string, userId: string, displayName: string) {
  return useSync({
    uri: `ws://${window.location.hostname}:3000/rooms/${roomId}/board-sync?userId=${encodeURIComponent(userId)}`,
    assets: boardAssetStore,
    userInfo: {
      id: userId,
      name: displayName,
      color: colorForUserId(userId),
    },
  });
}
```

- [x] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit -w apps/client
```

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/hooks/useBoardSync.ts apps/client/src/lib/boardAssets.ts
git commit -m "feat(client): add tldraw board sync hook"
```

---

## Task 5: BoardPanel Component

**Files:**
- Create: `apps/client/src/components/BoardPanel.tsx`
- Create: `apps/client/src/tests/BoardPanel.test.tsx`
- Modify: `apps/client/src/index.css`

- [x] **Step 1: Add tldraw CSS import**

Prefer importing once in `main.tsx` or `index.css`:

```ts
import 'tldraw/tldraw.css';
```

- [x] **Step 2: Write a focused component test**

Mock `tldraw` and `useBoardSync` so the test checks:
- Loading state renders.
- Error state renders.
- Synced state renders the board container.

- [x] **Step 3: Implement `BoardPanel.tsx`**

```tsx
import { Tldraw } from 'tldraw';
import { useBoardSync } from '../hooks/useBoardSync';

interface BoardPanelProps {
  roomId: string;
  userId: string;
  displayName: string;
}

export default function BoardPanel({ roomId, userId, displayName }: BoardPanelProps) {
  const store = useBoardSync(roomId, userId, displayName);

  if (store.status === 'loading') {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading board...</div>;
  }

  if (store.status === 'error') {
    return <div className="flex h-full items-center justify-center text-sm text-destructive">Could not load board.</div>;
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <Tldraw store={store.store} />
    </div>
  );
}
```

Adjust for the exact `useSync` return shape in the installed package.

- [x] **Step 4: Run client tests**

```bash
npm test -w apps/client
```

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/components/BoardPanel.tsx apps/client/src/tests/BoardPanel.test.tsx apps/client/src/main.tsx apps/client/src/index.css
git commit -m "feat(client): add collaborative BoardPanel"
```

---

## Task 6: Workspace Tabs and Split Layout

**Files:**
- Create: `apps/client/src/components/WorkspaceTabs.tsx`
- Create: `apps/client/src/tests/WorkspaceTabs.test.tsx`
- Modify: `apps/client/src/components/room/AdmittedRoom.tsx`

**UX:**
- Top tab strip inside the workspace: `main.js` and `Board`.
- Default view: code editor selected.
- Clicking `Board` switches to board full view.
- A `Split` toggle shows code and board side-by-side using `allotment`.
- Output panel stays below the workspace.
- Video sidebar stays fixed on the right through existing `RoomShell`.

- [x] **Step 1: Write tests**

Test cases:
- Renders Code and Board tabs.
- Starts with code visible.
- Clicking Board shows board.
- Split toggle shows both panels.
- Switching back from split preserves selected tab state.

- [x] **Step 2: Implement `WorkspaceTabs.tsx`**

Use shadcn-style `Button` components for tabs and split toggle. Do not use raw buttons in app code.

Pseudo-structure:

```tsx
import { useState } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Button } from '@/components/ui/button';
import BoardPanel from './BoardPanel';
import EditorPanel from './EditorPanel';

type ActiveTab = 'code' | 'board';

export default function WorkspaceTabs(props: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');
  const [split, setSplit] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted px-2 py-1">
        <Button variant={activeTab === 'code' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('code')}>main.js</Button>
        <Button variant={activeTab === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('board')}>Board</Button>
        <Button className="ml-auto" variant={split ? 'secondary' : 'outline'} size="sm" onClick={() => setSplit(value => !value)}>Split</Button>
      </div>

      <div className="min-h-0 flex-1">
        {split ? (
          <Allotment defaultSizes={[60, 40]}>
            <EditorPanel {...editorProps} />
            <BoardPanel {...boardProps} />
          </Allotment>
        ) : activeTab === 'code' ? (
          <EditorPanel {...editorProps} />
        ) : (
          <BoardPanel {...boardProps} />
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Update `AdmittedRoom.tsx`**

Replace direct `EditorPanel` child with `WorkspaceTabs`, passing:
- `roomId`
- `userId`
- `displayName`
- `ydoc`
- `provider`
- `connected`

- [x] **Step 4: Run client tests and TypeScript**

```bash
npm test -w apps/client
npx tsc --noEmit -w apps/client
```

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/components/WorkspaceTabs.tsx apps/client/src/tests/WorkspaceTabs.test.tsx apps/client/src/components/room/AdmittedRoom.tsx
git commit -m "feat(client): add code and board workspace tabs"
```

---

## Task 7: Presence Polish for Board Users

**Files:**
- Modify: `apps/client/src/hooks/useAwareness.ts`
- Modify: `apps/client/src/hooks/useBoardSync.ts`
- Modify: `apps/client/src/components/RoomShell.tsx`
- Modify: `apps/client/src/components/VideoSidebar.tsx`

**Goal:** Keep participant identity consistent across editor, board, and sidebar.

- [x] **Step 1: Share color/name helpers**

Ensure both CodeMirror awareness and tldraw `userInfo` use:
- same `userId`
- same display name
- same deterministic color

- [ ] **Step 2: Track active panel focus**

Add an optional local awareness field:

```ts
panel: 'code' | 'board'
```

Update it when switching tabs or split mode focus changes.

- [ ] **Step 3: Surface focus in sidebar**

Show a compact `Code` / `Board` badge in `VideoSidebar` for each user when available.

- [x] **Step 4: Run client tests**

Add or update tests for sidebar focus badges if practical.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/hooks apps/client/src/components
git commit -m "feat(client): unify presence across code and board"
```

---

## Task 8: Manual Integration Smoke Test

- [x] **Step 1: Start server**

```bash
npm run dev:server
```

Expected:
- Room API on `http://localhost:3000`
- Hocuspocus on `ws://localhost:1234`
- Board sync on `ws://localhost:3000/rooms/:roomId/board-sync`

- [ ] **Step 2: Start client**

```bash
npm run dev -w apps/client -- --host 127.0.0.1
```

- [x] **Step 3: Create a room in Tab 1**

Expected:
- Host enters room.
- Code editor visible.
- Board tab visible.

- [x] **Step 4: Join from Tab 2**

Expected:
- Joiner waits in lobby.
- Host sees one admit prompt.
- Admit moves joiner into room.

- [x] **Step 5: Test board sync**

Actions:
- Tab 1 opens Board tab.
- Draw a rectangle.
- Tab 2 opens Board tab.
- Verify rectangle appears.
- Tab 2 moves the rectangle.
- Verify Tab 1 updates.

- [ ] **Step 6: Test split mode**

Actions:
- Enable Split.
- Verify code and board are side-by-side.
- Resize divider.
- Verify output panel stays below and video sidebar stays fixed.

- [ ] **Step 7: Test code still syncs**

Actions:
- Switch back to code.
- Type in Tab 1.
- Verify Tab 2 receives text.

- [ ] **Step 8: Test refresh**

Actions:
- Refresh both tabs.
- Rejoin with stored display names.
- Verify board content reloads from persisted snapshot.

- [ ] **Step 9: Stop servers and commit**

```bash
git add .
git commit -m "feat: Phase 2 whiteboard complete"
```

---

## Task 9: Phase 2 Verification

- [x] **Step 1: Run full test suite**

```bash
npm test
```

- [x] **Step 2: Run TypeScript checks**

```bash
npx tsc --noEmit -w apps/client
npx tsc --noEmit -w apps/server
```

- [x] **Step 3: Run production client build**

```bash
npm run build -w apps/client
```

- [ ] **Step 4: Document known limitations**

Add a short note to the plan or README:
- Phase 2 asset uploads are prototype-only and reject large files.
- Board sync uses LevelDB-backed `InMemorySyncStorage` snapshots.
- Production tldraw deployments should consider `SQLiteSyncStorage` or the official Cloudflare template.

- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/plans/2026-04-30-collabcode-phase2.md
git commit -m "docs: Phase 2 whiteboard implementation plan"
```
