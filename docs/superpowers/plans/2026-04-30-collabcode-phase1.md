# CollabCode Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working collaborative room with a real-time shared code editor, display-name-based identity, and host-controlled admit/deny access — no accounts required.

**Architecture:** Two Node.js servers in one process (Express Room API on :3000 + Hocuspocus WS on :1234) share an in-memory `roomStore`. The React client connects to both: HTTP for room lifecycle and a Hocuspocus WebSocket for Yjs document sync. Participants heartbeat every 3s via `/ping`; the host receives pending knock requests in the same response and calls `/admit` to resolve them.

**Tech Stack:** Node.js + Express + TypeScript (server), React 18 + Vite + TypeScript (client), Yjs + Hocuspocus (real-time sync), CodeMirror 6 + y-codemirror.next (editor), `level` (LevelDB persistence), Tailwind CSS + shadcn/ui (UI components), Vitest + Supertest + React Testing Library (tests).

> **Phases 2–4** (Whiteboard, Video/Audio, Code Execution) each get their own plan after this one ships.

---

## File Map

```
collabcode/
├── package.json                          # npm workspaces root
├── apps/
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # start Express + Hocuspocus
│   │       ├── types.ts                  # shared server types
│   │       ├── roomStore.ts              # in-memory room state
│   │       ├── roomApi.ts                # Express app + all routes
│   │       └── hocuspocus.ts             # Hocuspocus server config
│   │   └── tests/
│   │       ├── roomStore.test.ts
│   │       └── roomApi.test.ts
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── types.ts                  # shared client types
│           ├── lib/
│           │   ├── api.ts                # fetch wrappers for Room API
│           │   └── colors.ts             # deterministic cursor color per userId
│           ├── hooks/
│           │   ├── useRoom.ts            # join state machine
│           │   ├── useYjs.ts             # Hocuspocus WS connection
│           │   ├── useAwareness.ts       # Yjs presence (names, cursors)
│           │   └── usePing.ts            # heartbeat + knock polling (host)
│           ├── pages/
│           │   ├── HomePage.tsx          # create/join room form
│           │   └── RoomPage.tsx          # root room page
│           └── components/
│               ├── LobbyView.tsx         # waiting room UI
│               ├── RoomShell.tsx         # top bar + layout skeleton
│               ├── EditorPanel.tsx       # CodeMirror 6 editor
│               ├── OutputPanel.tsx       # execution output (static in Phase 1)
│               ├── VideoSidebar.tsx      # permanent right sidebar (stub in Phase 1)
│               └── KnockBanner.tsx       # host admit/deny prompt
│       └── src/tests/
│           ├── api.test.ts
│           ├── colors.test.ts
│           ├── HomePage.test.tsx
│           ├── LobbyView.test.tsx
│           └── KnockBanner.test.tsx
└── docs/
    └── superpowers/
        ├── specs/2026-04-30-collabcode-design.md
        └── plans/2026-04-30-collabcode-phase1.md   ← this file
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/client/package.json`
- Create: `apps/client/tsconfig.json`
- Create: `apps/client/vite.config.ts`

- [ ] **Step 1: Create root workspace**

```json
// package.json
{
  "name": "collabcode",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:server": "npm run dev -w apps/server",
    "dev:client": "npm run dev -w apps/client",
    "test": "npm run test --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Create server package**

```json
// apps/server/package.json
{
  "name": "@collabcode/server",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@hocuspocus/server": "^2.13.0",
    "@hocuspocus/extension-database": "^2.13.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "level": "^8.0.1",
    "nanoid": "^5.0.7"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.13.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.11.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

```json
// apps/server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "esModuleInterop": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create client package**

```json
// apps/client/package.json
{
  "name": "@collabcode/client",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@hocuspocus/provider": "^2.13.0",
    "codemirror": "^6.0.1",
    "nanoid": "^5.0.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "y-codemirror.next": "^0.3.5",
    "yjs": "^13.6.15"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.5",
    "@testing-library/react": "^15.0.7",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.0",
    "msw": "^2.3.1",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

```json
// apps/client/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

```typescript
// apps/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/rooms': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
```

- [ ] **Step 4: Create Tailwind + PostCSS config**

```js
// apps/client/postcss.config.js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

```ts
// apps/client/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Add shadcn CSS variables and Tailwind directives**

```css
/* apps/client/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222 47% 6%;
    --foreground: 213 31% 91%;
    --border: 216 34% 17%;
    --primary: 213 94% 55%;
    --primary-foreground: 0 0% 100%;
    --muted: 223 47% 11%;
    --muted-foreground: 215 20% 55%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --radius: 0.5rem;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; overflow: hidden; }
body { font-family: system-ui, sans-serif; background: hsl(var(--background)); color: hsl(var(--foreground)); }
```

Update `index.html` to import the CSS:

```html
<!-- apps/client/index.html — add inside <head> -->
<link rel="stylesheet" href="/src/index.css" />
```

- [ ] **Step 6: Add shadcn path alias to vite.config.ts and tsconfig.json**

```typescript
// apps/client/vite.config.ts — replace with:
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: { '/rooms': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
```

```json
// apps/client/tsconfig.json — add inside compilerOptions:
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 7: Install shadcn components**

```bash
cd apps/client
npx shadcn@latest add button input card badge avatar
```

This generates:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/avatar.tsx`
- `src/lib/utils.ts` (the `cn` helper)

Also creates `components.json` in `apps/client/`.

- [ ] **Step 8: Create test setup file**

```typescript
// apps/client/src/tests/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 9: Install dependencies**

```bash
cd /Users/swanandmathekar/Projects/collabcode
npm install
```

Expected: both workspaces installed, no errors.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd apps/server && npx tsc --noEmit
cd ../client && npx tsc --noEmit
```

Expected: no errors (no source files yet, that's fine).

- [ ] **Step 11: Commit**

```bash
git init
echo "node_modules\ndist\ndata\n.superpowers" > .gitignore
git add package.json apps/server/package.json apps/server/tsconfig.json \
  apps/client/package.json apps/client/tsconfig.json apps/client/vite.config.ts \
  apps/client/tailwind.config.ts apps/client/postcss.config.js \
  apps/client/src/index.css apps/client/src/tests/setup.ts \
  apps/client/src/components/ui/ apps/client/src/lib/utils.ts \
  apps/client/components.json apps/client/index.html .gitignore
git commit -m "chore: monorepo scaffold with Tailwind + shadcn/ui"
```

---

## Task 2: Server Types + roomStore

**Files:**
- Create: `apps/server/src/types.ts`
- Create: `apps/server/src/roomStore.ts`
- Create: `apps/server/tests/roomStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/server/tests/roomStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom, getRoom, addParticipant, removeParticipant,
  createKnockRequest, resolveKnockRequest, getKnockRequest,
  getPendingKnocks, heartbeat, cleanupExpiredRooms,
} from '../src/roomStore.js';

beforeEach(() => {
  // Reset module state between tests by reimporting — handled by vitest isolation
});

describe('createRoom', () => {
  it('returns roomId and hostSecret', () => {
    const { roomId, hostSecret } = createRoom();
    expect(roomId).toHaveLength(10);
    expect(hostSecret).toHaveLength(21);
  });

  it('creates distinct rooms on each call', () => {
    const a = createRoom();
    const b = createRoom();
    expect(a.roomId).not.toBe(b.roomId);
    expect(a.hostSecret).not.toBe(b.hostSecret);
  });
});

describe('addParticipant + getRoom', () => {
  it('room starts with zero participants', () => {
    const { roomId } = createRoom();
    expect(getRoom(roomId)!.participants.size).toBe(0);
  });

  it('adds participant to room', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'Sam', joinedAt: Date.now() });
    expect(getRoom(roomId)!.participants.get('u1')!.displayName).toBe('Sam');
  });
});

describe('removeParticipant + host promotion', () => {
  it('returns null when non-host leaves', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: 1000 });
    addParticipant(roomId, { userId: 'other', displayName: 'Other', joinedAt: 2000 });
    getRoom(roomId)!.hostUserId = 'host';
    const newHost = removeParticipant(roomId, 'other');
    expect(newHost).toBeNull();
  });

  it('promotes oldest remaining when host leaves', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: 1000 });
    addParticipant(roomId, { userId: 'p1', displayName: 'P1', joinedAt: 2000 });
    addParticipant(roomId, { userId: 'p2', displayName: 'P2', joinedAt: 3000 });
    getRoom(roomId)!.hostUserId = 'host';
    const newHost = removeParticipant(roomId, 'host');
    expect(newHost).toBe('p1');
    expect(getRoom(roomId)!.hostUserId).toBe('p1');
  });
});

describe('knock requests', () => {
  it('creates and retrieves a knock request', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex');
    expect(knock).not.toBeNull();
    expect(knock!.displayName).toBe('Alex');
    expect(knock!.status).toBe('pending');
    expect(getKnockRequest(roomId, knock!.requestId)).toEqual(knock);
  });

  it('resolves knock to admitted', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex')!;
    const resolved = resolveKnockRequest(roomId, knock.requestId, 'admit');
    expect(resolved!.status).toBe('admitted');
  });

  it('resolves knock to denied', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex')!;
    resolveKnockRequest(roomId, knock.requestId, 'deny');
    expect(getKnockRequest(roomId, knock.requestId)!.status).toBe('denied');
  });

  it('getPendingKnocks returns only pending ones', () => {
    const { roomId } = createRoom();
    const k1 = createKnockRequest(roomId, 'A')!;
    const k2 = createKnockRequest(roomId, 'B')!;
    resolveKnockRequest(roomId, k1.requestId, 'admit');
    const pending = getPendingKnocks(roomId);
    expect(pending).toHaveLength(1);
    expect(pending[0].requestId).toBe(k2.requestId);
  });
});

describe('heartbeat + host promotion via timeout', () => {
  it('returns the room on valid heartbeat', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'U1', joinedAt: Date.now() });
    const room = heartbeat(roomId, 'u1');
    expect(room).not.toBeNull();
  });

  it('promotes participant when host lastSeen is stale', () => {
    const { roomId } = createRoom();
    const now = Date.now();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: now - 60000 });
    addParticipant(roomId, { userId: 'p1', displayName: 'P1', joinedAt: now - 50000 });
    const room = getRoom(roomId)!;
    room.hostUserId = 'host';
    // Manually set host lastSeen to 40 seconds ago (beyond 30s timeout)
    room.participants.get('host')!.lastSeen = now - 40000;
    room.participants.get('p1')!.lastSeen = now;
    heartbeat(roomId, 'p1');
    expect(getRoom(roomId)!.hostUserId).toBe('p1');
  });
});

describe('cleanupExpiredRooms', () => {
  it('removes rooms with no participants inactive for over 24h', () => {
    const { roomId } = createRoom();
    const room = getRoom(roomId)!;
    room.lastActiveAt = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    cleanupExpiredRooms();
    expect(getRoom(roomId)).toBeUndefined();
  });

  it('keeps rooms with active participants', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'U', joinedAt: Date.now() });
    getRoom(roomId)!.lastActiveAt = Date.now() - 25 * 60 * 60 * 1000;
    cleanupExpiredRooms();
    expect(getRoom(roomId)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd apps/server && npx vitest run tests/roomStore.test.ts
```

Expected: errors like `Cannot find module '../src/roomStore.js'`

- [ ] **Step 3: Write types.ts**

```typescript
// apps/server/src/types.ts
export interface Participant {
  userId: string;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
}

export interface KnockRequest {
  requestId: string;
  displayName: string;
  status: 'pending' | 'admitted' | 'denied';
  userId: string;
  createdAt: number;
}

export interface Room {
  roomId: string;
  hostSecret: string;
  hostUserId: string | null;
  participants: Map<string, Participant>;
  knockRequests: Map<string, KnockRequest>;
  createdAt: number;
  lastActiveAt: number;
}
```

- [ ] **Step 4: Write roomStore.ts**

```typescript
// apps/server/src/roomStore.ts
import { nanoid } from 'nanoid';
import type { Room, Participant, KnockRequest } from './types.js';

const rooms = new Map<string, Room>();

export function createRoom(): { roomId: string; hostSecret: string } {
  const roomId = nanoid(10);
  const hostSecret = nanoid(21);
  rooms.set(roomId, {
    roomId,
    hostSecret,
    hostUserId: null,
    participants: new Map(),
    knockRequests: new Map(),
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  });
  return { roomId, hostSecret };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function addParticipant(roomId: string, p: Omit<Participant, 'lastSeen'>): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.participants.set(p.userId, { ...p, lastSeen: Date.now() });
  room.lastActiveAt = Date.now();
}

export function removeParticipant(roomId: string, userId: string): string | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const wasHost = room.hostUserId === userId;
  room.participants.delete(userId);
  room.lastActiveAt = Date.now();
  if (!wasHost) return null;
  const oldest = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostUserId = oldest?.userId ?? null;
  return room.hostUserId;
}

export function createKnockRequest(roomId: string, displayName: string): KnockRequest | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const request: KnockRequest = {
    requestId: nanoid(10),
    displayName,
    status: 'pending',
    userId: nanoid(10),
    createdAt: Date.now(),
  };
  room.knockRequests.set(request.requestId, request);
  return request;
}

export function resolveKnockRequest(
  roomId: string,
  requestId: string,
  decision: 'admit' | 'deny',
): KnockRequest | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const request = room.knockRequests.get(requestId);
  if (!request || request.status !== 'pending') return null;
  request.status = decision === 'admit' ? 'admitted' : 'denied';
  return request;
}

export function getKnockRequest(roomId: string, requestId: string): KnockRequest | null {
  return rooms.get(roomId)?.knockRequests.get(requestId) ?? null;
}

export function getPendingKnocks(roomId: string): KnockRequest[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.knockRequests.values()].filter(r => r.status === 'pending');
}

const HOST_TIMEOUT_MS = 30_000;

export function heartbeat(roomId: string, userId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const participant = room.participants.get(userId);
  if (participant) {
    participant.lastSeen = Date.now();
    room.lastActiveAt = Date.now();
  }
  // Promote if host has timed out
  if (room.hostUserId) {
    const host = room.participants.get(room.hostUserId);
    if (!host || Date.now() - host.lastSeen > HOST_TIMEOUT_MS) {
      const oldest = [...room.participants.values()]
        .filter(p => p.userId !== room.hostUserId)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostUserId = oldest?.userId ?? null;
    }
  }
  return room;
}

const TTL_MS = 24 * 60 * 60 * 1000;

export function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.participants.size === 0 && now - room.lastActiveAt > TTL_MS) {
      rooms.delete(roomId);
    }
  }
}

// Exposed for tests only
export function _resetStore(): void {
  rooms.clear();
}
```

- [ ] **Step 5: Update test file to use _resetStore**

Add `import { _resetStore } from '../src/roomStore.js';` and `beforeEach(() => { _resetStore(); });` at the top of `roomStore.test.ts` (replace the existing `beforeEach`).

- [ ] **Step 6: Run tests — expect pass**

```bash
cd apps/server && npx vitest run tests/roomStore.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/types.ts apps/server/src/roomStore.ts apps/server/tests/roomStore.test.ts
git commit -m "feat(server): roomStore with room lifecycle and admit control"
```

---

## Task 3: Room API — Create + Validate Routes

**Files:**
- Create: `apps/server/src/roomApi.ts`
- Create: `apps/server/tests/roomApi.test.ts`

- [ ] **Step 1: Write failing tests for create + validate**

```typescript
// apps/server/tests/roomApi.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/roomApi.js';
import { _resetStore } from '../src/roomStore.js';

beforeEach(() => _resetStore());

describe('POST /rooms', () => {
  it('creates a room and returns roomId + hostSecret', async () => {
    const res = await request(app).post('/rooms').expect(200);
    expect(res.body.roomId).toHaveLength(10);
    expect(res.body.hostSecret).toHaveLength(21);
  });
});

describe('GET /rooms/:id', () => {
  it('returns 404 for unknown room', async () => {
    await request(app).get('/rooms/doesnotexist').expect(404);
  });

  it('returns room info for valid room', async () => {
    const { body } = await request(app).post('/rooms');
    const res = await request(app).get(`/rooms/${body.roomId}`).expect(200);
    expect(res.body.roomId).toBe(body.roomId);
    expect(res.body.participantCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/server && npx vitest run tests/roomApi.test.ts
```

Expected: `Cannot find module '../src/roomApi.js'`

- [ ] **Step 3: Write roomApi.ts with create + validate routes**

```typescript
// apps/server/src/roomApi.ts
import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import * as store from './roomStore.js';

export const app = express();
app.use(cors());
app.use(express.json());

// POST /rooms — create room
app.post('/rooms', (_req, res) => {
  const { roomId, hostSecret } = store.createRoom();
  res.json({ roomId, hostSecret });
});

// GET /rooms/:id — validate room
app.get('/rooms/:id', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ roomId: room.roomId, participantCount: room.participants.size });
});
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd apps/server && npx vitest run tests/roomApi.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/roomApi.ts apps/server/tests/roomApi.test.ts
git commit -m "feat(server): POST /rooms and GET /rooms/:id"
```

---

## Task 4: Room API — Join, Poll, Ping Routes

**Files:**
- Modify: `apps/server/src/roomApi.ts`
- Modify: `apps/server/tests/roomApi.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `apps/server/tests/roomApi.test.ts`:

```typescript
describe('POST /rooms/:id/join', () => {
  it('returns 404 for unknown room', async () => {
    await request(app)
      .post('/rooms/nope/join')
      .send({ displayName: 'Sam' })
      .expect(404);
  });

  it('admits host immediately when hostSecret matches', async () => {
    const { body: room } = await request(app).post('/rooms');
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret })
      .expect(200);
    expect(res.body.status).toBe('admitted');
    expect(res.body.userId).toBeDefined();
  });

  it('returns 403 when room is full', async () => {
    const { body: room } = await request(app).post('/rooms');
    // Fill room with 10 participants via host join + 9 direct adds
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { _resetStore: _, ...storeModule } = await import('../src/roomStore.js');
    // Add 9 more participants directly
    for (let i = 0; i < 9; i++) {
      storeModule.addParticipant(room.roomId, {
        userId: `u${i}`, displayName: `P${i}`, joinedAt: Date.now(),
      });
    }
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Overflow' })
      .expect(403);
    expect(res.body.error).toMatch(/full/i);
  });

  it('returns requestId for non-host joiner', async () => {
    const { body: room } = await request(app).post('/rooms');
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' })
      .expect(200);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.status).toBeUndefined();
  });

  it('returns 400 when displayName is missing', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app).post(`/rooms/${room.roomId}/join`).send({}).expect(400);
  });
});

describe('GET /rooms/:id/join-status/:requestId', () => {
  it('returns pending status while waiting', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${join.requestId}`)
      .expect(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns admitted status after host admits', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${join.requestId}`)
      .expect(200);
    expect(res.body.status).toBe('admitted');
    expect(res.body.userId).toBeDefined();
  });
});

describe('GET /rooms/:id/ping', () => {
  it('returns isHost true for the host participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${join.userId}`)
      .expect(200);
    expect(res.body.isHost).toBe(true);
  });

  it('returns pendingKnocks only for host', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${join.userId}`)
      .expect(200);
    expect(res.body.pendingKnocks).toHaveLength(1);
    expect(res.body.pendingKnocks[0].displayName).toBe('Alex');
  });

  it('returns isHost false and no pendingKnocks for non-host', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: hostJoin } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: knock } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: knock.requestId, decision: 'admit', hostSecret: room.hostSecret });
    const { body: pollJoin } = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${knock.requestId}`);
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${pollJoin.userId}`)
      .expect(200);
    expect(res.body.isHost).toBe(false);
    expect(res.body.pendingKnocks).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/server && npx vitest run tests/roomApi.test.ts
```

Expected: failures for new routes (404s from Express).

- [ ] **Step 3: Add join, poll, and ping routes to roomApi.ts**

Append to `apps/server/src/roomApi.ts`:

```typescript
// POST /rooms/:id/join — host gets admitted immediately; others enter knock queue
app.post('/rooms/:id/join', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.participants.size >= 10) return res.status(403).json({ error: 'Room is full' });

  const { displayName, hostSecret } = req.body as {
    displayName?: string;
    hostSecret?: string;
  };

  if (!displayName?.trim()) return res.status(400).json({ error: 'displayName required' });

  if (hostSecret && hostSecret === room.hostSecret) {
    const userId = nanoid(10);
    store.addParticipant(req.params.id, { userId, displayName, joinedAt: Date.now() });
    room.hostUserId = userId;
    return res.json({ status: 'admitted', userId });
  }

  const knock = store.createKnockRequest(req.params.id, displayName);
  if (!knock) return res.status(500).json({ error: 'Internal error' });
  res.json({ requestId: knock.requestId });
});

// GET /rooms/:id/join-status/:requestId — joiner polls this
app.get('/rooms/:id/join-status/:requestId', (req, res) => {
  const knock = store.getKnockRequest(req.params.id, req.params.requestId);
  if (!knock) return res.status(404).json({ error: 'Request not found' });
  if (knock.status === 'admitted') {
    return res.json({ status: 'admitted', userId: knock.userId });
  }
  res.json({ status: knock.status });
});

// GET /rooms/:id/ping?userId=xxx — heartbeat; host gets pending knocks
app.get('/rooms/:id/ping', (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const room = store.heartbeat(req.params.id, userId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const isHost = room.hostUserId === userId;
  if (isHost) {
    return res.json({
      isHost: true,
      pendingKnocks: store.getPendingKnocks(req.params.id).map(k => ({
        requestId: k.requestId,
        displayName: k.displayName,
      })),
    });
  }
  res.json({ isHost: false });
});
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd apps/server && npx vitest run tests/roomApi.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/roomApi.ts apps/server/tests/roomApi.test.ts
git commit -m "feat(server): join, poll, and ping routes with admit control"
```

---

## Task 5: Room API — Admit Route

**Files:**
- Modify: `apps/server/src/roomApi.ts`
- Modify: `apps/server/tests/roomApi.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `apps/server/tests/roomApi.test.ts`:

```typescript
describe('POST /rooms/:id/admit', () => {
  it('returns 403 when hostSecret is wrong', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: 'wrong' })
      .expect(403);
  });

  it('admits joiner and adds them as participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret })
      .expect(200);
    expect(res.body.ok).toBe(true);
    // Participant count should be 2 (host + Alex)
    const roomInfo = await request(app).get(`/rooms/${room.roomId}`);
    expect(roomInfo.body.participantCount).toBe(2);
  });

  it('denies joiner and does not add them as participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'deny', hostSecret: room.hostSecret })
      .expect(200);
    const roomInfo = await request(app).get(`/rooms/${room.roomId}`);
    expect(roomInfo.body.participantCount).toBe(1);
  });

  it('returns 404 for already-resolved request', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret })
      .expect(404);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/server && npx vitest run tests/roomApi.test.ts
```

Expected: 404/500 on admit endpoint.

- [ ] **Step 3: Add admit route to roomApi.ts**

Append to `apps/server/src/roomApi.ts`:

```typescript
// POST /rooms/:id/admit — host admits or denies a waiting joiner
app.post('/rooms/:id/admit', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { requestId, decision, hostSecret } = req.body as {
    requestId: string;
    decision: 'admit' | 'deny';
    hostSecret: string;
  };

  if (hostSecret !== room.hostSecret) return res.status(403).json({ error: 'Forbidden' });

  const knock = store.resolveKnockRequest(req.params.id, requestId, decision);
  if (!knock) return res.status(404).json({ error: 'Request not found or already resolved' });

  if (decision === 'admit') {
    store.addParticipant(req.params.id, {
      userId: knock.userId,
      displayName: knock.displayName,
      joinedAt: Date.now(),
    });
  }

  res.json({ ok: true });
});
```

- [ ] **Step 4: Run all server tests — expect all pass**

```bash
cd apps/server && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/roomApi.ts apps/server/tests/roomApi.test.ts
git commit -m "feat(server): POST /rooms/:id/admit with host verification"
```

---

## Task 6: Hocuspocus Server + LevelDB

**Files:**
- Create: `apps/server/src/hocuspocus.ts`

- [ ] **Step 1: Write hocuspocus.ts**

```typescript
// apps/server/src/hocuspocus.ts
import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Level } from 'level';
import * as store from './roomStore.js';

const db = new Level<string, Uint8Array>('./data', { valueEncoding: 'buffer' });

export const hocuspocus = Server.configure({
  port: 1234,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try {
          return await db.get(documentName) as unknown as Uint8Array;
        } catch {
          return null;
        }
      },
      store: async ({ documentName, state }) => {
        await db.put(documentName, state as unknown as Uint8Array);
      },
    }),
  ],

  async onConnect({ documentName, token, context }) {
    // documentName format: "editor:{roomId}" or "board:{roomId}" or "output:{roomId}"
    const roomId = documentName.split(':')[1];
    if (!roomId) throw new Error('Invalid document name');

    const room = store.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    // token is the userId — verify they are an admitted participant
    const userId = token as string;
    if (!room.participants.has(userId)) {
      throw new Error('Not admitted to room');
    }

    context.userId = userId;
    context.roomId = roomId;
  },

  async onDisconnect({ context }) {
    const { userId, roomId } = context as { userId?: string; roomId?: string };
    if (userId && roomId) {
      store.removeParticipant(roomId, userId);
    }
  },
});
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/hocuspocus.ts
git commit -m "feat(server): Hocuspocus server with LevelDB persistence"
```

---

## Task 7: Server Entry Point

**Files:**
- Create: `apps/server/src/index.ts`

- [ ] **Step 1: Write index.ts**

```typescript
// apps/server/src/index.ts
import { app } from './roomApi.js';
import { hocuspocus } from './hocuspocus.js';
import { cleanupExpiredRooms } from './roomStore.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Room API listening on http://localhost:${PORT}`);
});

hocuspocus.listen().then(() => {
  console.log('Hocuspocus listening on ws://localhost:1234');
});

// Clean up expired rooms every hour
setInterval(cleanupExpiredRooms, 60 * 60 * 1000);
```

- [ ] **Step 2: Start the server and verify**

```bash
cd apps/server && npm run dev
```

Expected output:
```
Room API listening on http://localhost:3000
Hocuspocus listening on ws://localhost:1234
```

- [ ] **Step 3: Smoke test the API**

```bash
curl -s -X POST http://localhost:3000/rooms | jq .
```

Expected: `{ "roomId": "...", "hostSecret": "..." }`

- [ ] **Step 4: Stop server (Ctrl+C) and commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(server): entry point — start Express + Hocuspocus"
```

---

## Task 8: Client Scaffold + Routing + api.ts + colors.ts

**Files:**
- Create: `apps/client/src/main.tsx`
- Create: `apps/client/src/App.tsx`
- Create: `apps/client/src/types.ts`
- Create: `apps/client/src/lib/api.ts`
- Create: `apps/client/src/lib/colors.ts`
- Create: `apps/client/src/tests/api.test.ts`
- Create: `apps/client/src/tests/colors.test.ts`
- Create: `apps/client/index.html`

- [ ] **Step 1: Write failing tests for api.ts and colors.ts**

```typescript
// apps/client/src/tests/colors.test.ts
import { describe, it, expect } from 'vitest';
import { colorForUserId } from '../lib/colors';

describe('colorForUserId', () => {
  it('returns a hex color string', () => {
    expect(colorForUserId('abc')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns the same color for the same userId', () => {
    expect(colorForUserId('user1')).toBe(colorForUserId('user1'));
  });

  it('returns different colors for different userIds', () => {
    expect(colorForUserId('user1')).not.toBe(colorForUserId('user2'));
  });
});
```

```typescript
// apps/client/src/tests/api.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createRoom, validateRoom, joinRoom, pollJoinStatus, ping, admit } from '../lib/api';

const server = setupServer(
  http.post('/rooms', () => HttpResponse.json({ roomId: 'abc1234567', hostSecret: 'secret123456789012345' })),
  http.get('/rooms/:id', ({ params }) =>
    params.id === 'abc1234567'
      ? HttpResponse.json({ roomId: 'abc1234567', participantCount: 1 })
      : new HttpResponse(null, { status: 404 }),
  ),
  http.post('/rooms/:id/join', () => HttpResponse.json({ status: 'admitted', userId: 'u1' })),
  http.get('/rooms/:id/join-status/:requestId', () => HttpResponse.json({ status: 'pending' })),
  http.get('/rooms/:id/ping', () => HttpResponse.json({ isHost: true, pendingKnocks: [] })),
  http.post('/rooms/:id/admit', () => HttpResponse.json({ ok: true })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createRoom', () => {
  it('returns roomId and hostSecret', async () => {
    const result = await createRoom();
    expect(result.roomId).toBe('abc1234567');
    expect(result.hostSecret).toBeDefined();
  });
});

describe('validateRoom', () => {
  it('returns true for existing room', async () => {
    expect(await validateRoom('abc1234567')).toBe(true);
  });
  it('returns false for unknown room', async () => {
    expect(await validateRoom('nope')).toBe(false);
  });
});

describe('joinRoom', () => {
  it('returns admitted response', async () => {
    const result = await joinRoom('abc1234567', 'Sam', 'secret');
    expect(result.status).toBe('admitted');
  });
});

describe('pollJoinStatus', () => {
  it('returns status', async () => {
    const result = await pollJoinStatus('abc1234567', 'req1');
    expect(result.status).toBe('pending');
  });
});

describe('ping', () => {
  it('returns isHost and pendingKnocks', async () => {
    const result = await ping('abc1234567', 'u1');
    expect(result.isHost).toBe(true);
    expect(result.pendingKnocks).toEqual([]);
  });
});

describe('admit', () => {
  it('posts admit decision', async () => {
    const result = await admit('abc1234567', 'req1', 'admit', 'secret');
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/client && npx vitest run src/tests/colors.test.ts src/tests/api.test.ts
```

Expected: module not found errors.

- [ ] **Step 3: Write types.ts**

```typescript
// apps/client/src/types.ts
export interface PendingKnock {
  requestId: string;
  displayName: string;
}

export interface PingResponse {
  isHost: boolean;
  pendingKnocks?: PendingKnock[];
}

export type JoinResponse =
  | { status: 'admitted'; userId: string }
  | { requestId: string };

export type JoinStatusResponse =
  | { status: 'pending' }
  | { status: 'denied' }
  | { status: 'admitted'; userId: string };
```

- [ ] **Step 4: Write colors.ts**

```typescript
// apps/client/src/lib/colors.ts
const PALETTE = [
  '#e03131', '#2f9e44', '#1971c2', '#ae3ec9',
  '#f08c00', '#0c8599', '#c2255c', '#5c7cfa',
];

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
```

- [ ] **Step 5: Write api.ts**

```typescript
// apps/client/src/lib/api.ts
import type { JoinResponse, JoinStatusResponse, PingResponse } from '../types';

const BASE = '/rooms';

export async function createRoom(): Promise<{ roomId: string; hostSecret: string }> {
  const res = await fetch(`${BASE}`, { method: 'POST' });
  return res.json();
}

export async function validateRoom(roomId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${roomId}`);
  return res.ok;
}

export async function joinRoom(
  roomId: string,
  displayName: string,
  hostSecret?: string,
): Promise<JoinResponse> {
  const res = await fetch(`${BASE}/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, ...(hostSecret ? { hostSecret } : {}) }),
  });
  return res.json();
}

export async function pollJoinStatus(
  roomId: string,
  requestId: string,
): Promise<JoinStatusResponse> {
  const res = await fetch(`${BASE}/${roomId}/join-status/${requestId}`);
  return res.json();
}

export async function ping(roomId: string, userId: string): Promise<PingResponse> {
  const res = await fetch(`${BASE}/${roomId}/ping?userId=${userId}`);
  return res.json();
}

export async function admit(
  roomId: string,
  requestId: string,
  decision: 'admit' | 'deny',
  hostSecret: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/${roomId}/admit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, decision, hostSecret }),
  });
  return res.json();
}
```

- [ ] **Step 6: Write main.tsx, App.tsx, index.html**

```tsx
// apps/client/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

```tsx
// apps/client/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

```html
<!-- apps/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CollabCode</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; overflow: hidden; }
      body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Run tests — expect pass**

```bash
cd apps/client && npx vitest run src/tests/colors.test.ts src/tests/api.test.ts
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/client/
git commit -m "feat(client): scaffold, routing, api.ts, colors.ts"
```

---

## Task 9: Client — HomePage

**Files:**
- Create: `apps/client/src/pages/HomePage.tsx`
- Create: `apps/client/src/tests/HomePage.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/client/src/tests/HomePage.test.tsx
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import HomePage from '../pages/HomePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const server = setupServer(
  http.post('/rooms', () =>
    HttpResponse.json({ roomId: 'testroom01', hostSecret: 'secret123456789012345' }),
  ),
  http.get('/rooms/:id', ({ params }) =>
    params.id === 'existingroom'
      ? HttpResponse.json({ roomId: 'existingroom', participantCount: 1 })
      : new HttpResponse(null, { status: 404 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); mockNavigate.mockReset(); });
afterAll(() => server.close());

describe('HomePage', () => {
  it('renders create and join sections', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByText(/create a room/i)).toBeInTheDocument();
    expect(screen.getByText(/join a room/i)).toBeInTheDocument();
  });

  it('creates a room and navigates to it', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/room/testroom01'));
    expect(sessionStorage.getItem('hostSecret')).toBe('secret123456789012345');
    expect(sessionStorage.getItem('displayName')).toBe('Sam');
  });

  it('joins an existing room by ID', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.change(screen.getAllByPlaceholderText(/your name/i)[1], { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/room id/i), { target: { value: 'existingroom' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/room/existingroom'));
    expect(sessionStorage.getItem('displayName')).toBe('Alex');
  });

  it('shows error for unknown room', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.change(screen.getAllByPlaceholderText(/your name/i)[1], { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/room id/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));
    await waitFor(() => expect(screen.getByText(/room not found/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/client && npx vitest run src/tests/HomePage.test.tsx
```

Expected: `Cannot find module '../pages/HomePage'`

- [ ] **Step 3: Write HomePage.tsx**

```tsx
// apps/client/src/pages/HomePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createRoom, validateRoom } from '../lib/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!createName.trim()) return;
    setLoading(true);
    const { roomId, hostSecret } = await createRoom();
    sessionStorage.setItem('hostSecret', hostSecret);
    sessionStorage.setItem('displayName', createName.trim());
    navigate(`/room/${roomId}`);
  }

  async function handleJoin() {
    if (!joinName.trim() || !roomId.trim()) return;
    setLoading(true);
    setError('');
    const exists = await validateRoom(roomId.trim());
    if (!exists) {
      setError('Room not found.');
      setLoading(false);
      return;
    }
    sessionStorage.setItem('displayName', joinName.trim());
    navigate(`/room/${roomId.trim()}`);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-3xl font-bold mb-4">CollabCode</h1>

      <Card className="w-[360px]">
        <CardHeader><CardTitle>Create a Room</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Your name"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            Create Room
          </Button>
        </CardContent>
      </Card>

      <Card className="w-[360px]">
        <CardHeader><CardTitle>Join a Room</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Your name"
            value={joinName}
            onChange={e => setJoinName(e.target.value)}
          />
          <Input
            placeholder="Room ID"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleJoin} disabled={loading} className="w-full">
            Join Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd apps/client && npx vitest run src/tests/HomePage.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/pages/HomePage.tsx apps/client/src/tests/HomePage.test.tsx
git commit -m "feat(client): HomePage with create and join room flows"
```

---

## Task 10: Client — useRoom Hook + LobbyView

**Files:**
- Create: `apps/client/src/hooks/useRoom.ts`
- Create: `apps/client/src/components/LobbyView.tsx`
- Create: `apps/client/src/tests/LobbyView.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/client/src/tests/LobbyView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LobbyView from '../components/LobbyView';

describe('LobbyView', () => {
  it('shows waiting message', () => {
    render(<LobbyView displayName="Alex" onRetry={vi.fn()} denied={false} />);
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
  });

  it('shows denied message when denied=true', () => {
    render(<LobbyView displayName="Alex" onRetry={vi.fn()} denied={true} />);
    expect(screen.getByText(/didn't let you in/i)).toBeInTheDocument();
  });

  it('calls onRetry when Try Again is clicked', () => {
    const onRetry = vi.fn();
    render(<LobbyView displayName="Alex" onRetry={onRetry} denied={true} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/client && npx vitest run src/tests/LobbyView.test.tsx
```

Expected: `Cannot find module '../components/LobbyView'`

- [ ] **Step 3: Write LobbyView.tsx**

```tsx
// apps/client/src/components/LobbyView.tsx
import { Button } from '@/components/ui/button';

interface LobbyViewProps {
  displayName: string;
  denied: boolean;
  onRetry: () => void;
}

export default function LobbyView({ displayName, denied, onRetry }: LobbyViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      {denied ? (
        <>
          <p className="text-lg">
            The host didn't let you in, <strong>{displayName}</strong>.
          </p>
          <Button onClick={onRetry}>Try Again</Button>
        </>
      ) : (
        <>
          <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg">
            Waiting for the host to let you in, <strong>{displayName}</strong>…
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write useRoom.ts**

```typescript
// apps/client/src/hooks/useRoom.ts
import { useState, useEffect, useCallback } from 'react';
import { pollJoinStatus } from '../lib/api';
import type { JoinResponse } from '../types';

type RoomState =
  | { phase: 'joining' }
  | { phase: 'lobby'; requestId: string }
  | { phase: 'admitted'; userId: string }
  | { phase: 'denied' }
  | { phase: 'full' };

export function useRoom(roomId: string, displayName: string) {
  const [state, setState] = useState<RoomState>({ phase: 'joining' });
  const hostSecret = sessionStorage.getItem('hostSecret') ?? undefined;

  const doJoin = useCallback(async () => {
    setState({ phase: 'joining' });
    const res = await fetch(`/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, ...(hostSecret ? { hostSecret } : {}) }),
    });
    if (res.status === 403) { setState({ phase: 'full' }); return; }
    const result: JoinResponse = await res.json();
    if ('status' in result && result.status === 'admitted') {
      setState({ phase: 'admitted', userId: result.userId });
    } else if ('requestId' in result) {
      setState({ phase: 'lobby', requestId: result.requestId });
    }
  }, [roomId, displayName, hostSecret]);

  useEffect(() => { doJoin(); }, [doJoin]);

  // Poll join-status while in lobby
  useEffect(() => {
    if (state.phase !== 'lobby') return;
    const interval = setInterval(async () => {
      const result = await pollJoinStatus(roomId, state.requestId);
      if (result.status === 'admitted') {
        setState({ phase: 'admitted', userId: result.userId });
      } else if (result.status === 'denied') {
        setState({ phase: 'denied' });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [state, roomId]);

  return { state, retry: doJoin };
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd apps/client && npx vitest run src/tests/LobbyView.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/hooks/useRoom.ts apps/client/src/components/LobbyView.tsx apps/client/src/tests/LobbyView.test.tsx
git commit -m "feat(client): useRoom hook with lobby polling + LobbyView"
```

---

## Task 11: Client — useYjs + useAwareness Hooks

**Files:**
- Create: `apps/client/src/hooks/useYjs.ts`
- Create: `apps/client/src/hooks/useAwareness.ts`

Note: These hooks wrap external libraries (Hocuspocus WebSocket, Yjs Awareness) that require a live WebSocket server to test meaningfully. We write them without unit tests and verify through manual integration in Task 13.

- [ ] **Step 1: Write useYjs.ts**

```typescript
// apps/client/src/hooks/useYjs.ts
import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

export function useYjs(roomId: string, userId: string) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: `ws://${window.location.hostname}:1234`,
      name: `editor:${roomId}`,
      document: ydocRef.current,
      token: userId,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    });
    providerRef.current = provider;
    return () => {
      provider.destroy();
      setConnected(false);
    };
  }, [roomId, userId]);

  return { ydoc: ydocRef.current, provider: providerRef.current, connected };
}
```

- [ ] **Step 2: Write useAwareness.ts**

```typescript
// apps/client/src/hooks/useAwareness.ts
import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { colorForUserId } from '../lib/colors';

export interface AwarenessUser {
  userId: string;
  displayName: string;
  color: string;
}

export function useAwareness(
  provider: HocuspocusProvider | null,
  userId: string,
  displayName: string,
) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', {
      userId,
      displayName,
      color: colorForUserId(userId),
    });

    const onUpdate = () => {
      const states = [...awareness.getStates().values()];
      setUsers(states.map(s => s.user).filter(Boolean) as AwarenessUser[]);
    };
    awareness.on('update', onUpdate);
    return () => awareness.off('update', onUpdate);
  }, [provider, userId, displayName]);

  return users;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/hooks/useYjs.ts apps/client/src/hooks/useAwareness.ts
git commit -m "feat(client): useYjs and useAwareness hooks"
```

---

## Task 12: Client — RoomPage + RoomShell Layout

**Files:**
- Create: `apps/client/src/pages/RoomPage.tsx`
- Create: `apps/client/src/components/RoomShell.tsx`
- Create: `apps/client/src/components/VideoSidebar.tsx`

- [ ] **Step 1: Write VideoSidebar.tsx (stub)**

```tsx
// apps/client/src/components/VideoSidebar.tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AwarenessUser } from '../hooks/useAwareness';

interface VideoSidebarProps {
  users: AwarenessUser[];
}

export default function VideoSidebar({ users }: VideoSidebarProps) {
  return (
    <div className="w-22 shrink-0 bg-muted border-l border-border flex flex-col p-2 gap-2">
      <p className="text-[9px] text-muted-foreground uppercase tracking-widest text-center mb-1">
        Live
      </p>
      {users.map(user => (
        <div
          key={user.userId}
          className="flex flex-col items-center gap-1 rounded-md p-1 border"
          style={{ borderColor: user.color }}
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback style={{ background: user.color, color: '#fff', fontSize: 14 }}>
              {user.displayName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[9px] truncate w-full text-center" style={{ color: user.color }}>
            {user.displayName}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write RoomShell.tsx**

```tsx
// apps/client/src/components/RoomShell.tsx
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { AwarenessUser } from '../hooks/useAwareness';
import VideoSidebar from './VideoSidebar';

interface RoomShellProps {
  roomId: string;
  users: AwarenessUser[];
  isHost: boolean;
  children: ReactNode;
  outputPanel: ReactNode;
  knockBanner?: ReactNode;
}

export default function RoomShell({ roomId, users, isHost, children, outputPanel, knockBanner }: RoomShellProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border-b border-border shrink-0">
        <span className="text-primary font-bold text-sm">room/{roomId}</span>
        {isHost && <Badge variant="outline" className="text-[10px] border-green-500 text-green-400">host</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{users.length} online</span>
      </div>

      {/* Knock banner (host only) */}
      {knockBanner}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
          {outputPanel}
        </div>

        {/* Permanent video sidebar */}
        <VideoSidebar users={users} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write RoomPage.tsx**

```tsx
// apps/client/src/pages/RoomPage.tsx
import { useParams, Navigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { useYjs } from '../hooks/useYjs';
import { useAwareness } from '../hooks/useAwareness';
import LobbyView from '../components/LobbyView';
import RoomShell from '../components/RoomShell';
import EditorPanel from '../components/EditorPanel';
import OutputPanel from '../components/OutputPanel';
import KnockBanner from '../components/KnockBanner';
import { usePing } from '../hooks/usePing';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const displayName = sessionStorage.getItem('displayName') ?? 'Anonymous';

  if (!roomId) return <Navigate to="/" replace />;

  return <RoomPageInner roomId={roomId} displayName={displayName} />;
}

function RoomPageInner({ roomId, displayName }: { roomId: string; displayName: string }) {
  const { state, retry } = useRoom(roomId, displayName);

  if (state.phase === 'joining') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Connecting…</p>
      </div>
    );
  }

  if (state.phase === 'full') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>This room is full (10 participants max).</p>
      </div>
    );
  }

  if (state.phase === 'lobby' || state.phase === 'denied') {
    return (
      <LobbyView
        displayName={displayName}
        denied={state.phase === 'denied'}
        onRetry={retry}
      />
    );
  }

  // admitted
  return <AdmittedRoom roomId={roomId} userId={state.userId} displayName={displayName} />;
}

function AdmittedRoom({ roomId, userId, displayName }: { roomId: string; userId: string; displayName: string }) {
  const { ydoc, provider, connected } = useYjs(roomId, userId);
  const users = useAwareness(provider, userId, displayName);
  const hostSecret = sessionStorage.getItem('hostSecret') ?? undefined;
  const { isHost, knocks, handleAdmit, handleDeny } = usePing(roomId, userId, hostSecret);

  return (
    <RoomShell
      roomId={roomId}
      users={users}
      isHost={isHost}
      outputPanel={<OutputPanel />}
      knockBanner={
        knocks.length > 0 ? (
          <KnockBanner knocks={knocks} onAdmit={handleAdmit} onDeny={handleDeny} />
        ) : null
      }
    >
      <EditorPanel ydoc={ydoc} provider={provider} connected={connected} />
    </RoomShell>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: errors about missing `EditorPanel`, `OutputPanel`, `KnockBanner`, `usePing` — these are created in Tasks 13–15. That's fine.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/pages/RoomPage.tsx apps/client/src/components/RoomShell.tsx apps/client/src/components/VideoSidebar.tsx
git commit -m "feat(client): RoomPage + RoomShell layout + VideoSidebar stub"
```

---

## Task 13: Client — EditorPanel (CodeMirror 6 + y-codemirror)

**Files:**
- Create: `apps/client/src/components/EditorPanel.tsx`

- [ ] **Step 1: Write EditorPanel.tsx**

```tsx
// apps/client/src/components/EditorPanel.tsx
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';

interface EditorPanelProps {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  connected: boolean;
}

export default function EditorPanel({ ydoc, provider, connected }: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current || !provider) return;

    const yText = ydoc.getText('content');

    const view = new EditorView({
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        yCollab(yText, provider.awareness),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto', fontFamily: '"Fira Code", monospace', fontSize: '13px' },
        }),
      ],
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ydoc, provider]);

  // Toggle read-only when WS disconnects — Hocuspocus auto-reconnects in the background
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: EditorView.editable.reconfigure(!connected ? false : true),
    });
  }, [connected]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', background: '#0d1117' }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: only remaining errors are for OutputPanel, KnockBanner, usePing (not yet created).

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/components/EditorPanel.tsx
git commit -m "feat(client): EditorPanel with CodeMirror 6 + y-codemirror Yjs binding"
```

---

## Task 14: Client — OutputPanel (static)

**Files:**
- Create: `apps/client/src/components/OutputPanel.tsx`

- [ ] **Step 1: Write OutputPanel.tsx**

```tsx
// apps/client/src/components/OutputPanel.tsx
export default function OutputPanel() {
  return (
    <div className="bg-black/80 border-t border-border px-3 py-1.5 font-mono text-xs text-green-400 min-h-[36px] shrink-0">
      <span className="text-muted-foreground">▶</span>{' '}
      Output will appear here once code execution is wired up (Phase 4).
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/client/src/components/OutputPanel.tsx
git commit -m "feat(client): OutputPanel stub (Phase 4 will wire execution)"
```

---

## Task 15: Client — usePing + KnockBanner

**Files:**
- Create: `apps/client/src/hooks/usePing.ts`
- Create: `apps/client/src/components/KnockBanner.tsx`
- Create: `apps/client/src/tests/KnockBanner.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// apps/client/src/tests/KnockBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KnockBanner from '../components/KnockBanner';
import type { PendingKnock } from '../types';

const knocks: PendingKnock[] = [
  { requestId: 'req1', displayName: 'Alex' },
  { requestId: 'req2', displayName: 'Maya' },
];

describe('KnockBanner', () => {
  it('shows all pending joiner names', () => {
    render(<KnockBanner knocks={knocks} onAdmit={vi.fn()} onDeny={vi.fn()} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
  });

  it('calls onAdmit with requestId when Admit is clicked', () => {
    const onAdmit = vi.fn();
    render(<KnockBanner knocks={knocks} onAdmit={onAdmit} onDeny={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /admit/i })[0]);
    expect(onAdmit).toHaveBeenCalledWith('req1');
  });

  it('calls onDeny with requestId when Deny is clicked', () => {
    const onDeny = vi.fn();
    render(<KnockBanner knocks={knocks} onAdmit={vi.fn()} onDeny={onDeny} />);
    fireEvent.click(screen.getAllByRole('button', { name: /deny/i })[1]);
    expect(onDeny).toHaveBeenCalledWith('req2');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd apps/client && npx vitest run src/tests/KnockBanner.test.tsx
```

Expected: `Cannot find module '../components/KnockBanner'`

- [ ] **Step 3: Write KnockBanner.tsx**

```tsx
// apps/client/src/components/KnockBanner.tsx
import { Button } from '@/components/ui/button';
import type { PendingKnock } from '../types';

interface KnockBannerProps {
  knocks: PendingKnock[];
  onAdmit: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}

export default function KnockBanner({ knocks, onAdmit, onDeny }: KnockBannerProps) {
  if (knocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-2 bg-muted/60 border-b border-primary/40 shrink-0">
      {knocks.map(knock => (
        <div key={knock.requestId} className="flex items-center gap-3 text-sm">
          <span><strong>{knock.displayName}</strong> wants to join</span>
          <Button
            size="sm"
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500/10 h-7"
            onClick={() => onAdmit(knock.requestId)}
          >
            Admit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10 h-7"
            onClick={() => onDeny(knock.requestId)}
          >
            Deny
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write usePing.ts**

```typescript
// apps/client/src/hooks/usePing.ts
import { useState, useEffect, useCallback } from 'react';
import { ping, admit } from '../lib/api';
import type { PendingKnock } from '../types';

export function usePing(roomId: string, userId: string, hostSecret?: string) {
  const [isHost, setIsHost] = useState(false);
  const [knocks, setKnocks] = useState<PendingKnock[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await ping(roomId, userId);
      setIsHost(result.isHost);
      if (result.isHost && result.pendingKnocks) {
        setKnocks(result.pendingKnocks);
      }
    }, 3000);
    // Run immediately on mount
    ping(roomId, userId).then(result => {
      setIsHost(result.isHost);
      if (result.pendingKnocks) setKnocks(result.pendingKnocks);
    });
    return () => clearInterval(interval);
  }, [roomId, userId]);

  const handleAdmit = useCallback(async (requestId: string) => {
    if (!hostSecret) return;
    await admit(roomId, requestId, 'admit', hostSecret);
    setKnocks(prev => prev.filter(k => k.requestId !== requestId));
  }, [roomId, hostSecret]);

  const handleDeny = useCallback(async (requestId: string) => {
    if (!hostSecret) return;
    await admit(roomId, requestId, 'deny', hostSecret);
    setKnocks(prev => prev.filter(k => k.requestId !== requestId));
  }, [roomId, hostSecret]);

  return { isHost, knocks, handleAdmit, handleDeny };
}
```

- [ ] **Step 5: Run KnockBanner tests — expect pass**

```bash
cd apps/client && npx vitest run src/tests/KnockBanner.test.tsx
```

Expected: all PASS.

- [ ] **Step 6: Run all client tests**

```bash
cd apps/client && npx vitest run
```

Expected: all PASS.

- [ ] **Step 7: Run all server tests**

```bash
cd apps/server && npx vitest run
```

Expected: all PASS.

- [ ] **Step 8: Verify full TypeScript compile**

```bash
cd apps/client && npx tsc --noEmit
cd ../server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/client/src/hooks/usePing.ts apps/client/src/components/KnockBanner.tsx apps/client/src/tests/KnockBanner.test.tsx
git commit -m "feat(client): usePing heartbeat + KnockBanner admit/deny UI"
```

---

## Task 16: Integration Smoke Test

- [ ] **Step 1: Start Hocuspocus + Room API**

```bash
cd apps/server && npm run dev
```

Expected: `Room API listening on http://localhost:3000` and `Hocuspocus listening on ws://localhost:1234`

- [ ] **Step 2: Start client dev server**

```bash
cd apps/client && npm run dev
```

Expected: Vite server at `http://localhost:5173`

- [ ] **Step 3: Open two browser tabs**

Open `http://localhost:5173` in two separate tabs (or windows).

- [ ] **Step 4: Create a room in Tab 1**
  - Enter your name → click **Create Room**
  - You should land on `/room/<id>` with the editor visible
  - You are the host (green "host" badge in top bar)

- [ ] **Step 5: Join in Tab 2**
  - Go to `http://localhost:5173`
  - Enter a different name, paste the room ID from the URL
  - Click **Join Room**
  - You should see the "Waiting for the host" spinner

- [ ] **Step 6: Admit in Tab 1**
  - KnockBanner should appear within 3s with the joiner's name
  - Click **Admit**

- [ ] **Step 7: Verify Tab 2 enters the room**
  - Within 2s the joiner should land in the room with the editor

- [ ] **Step 8: Verify real-time sync**
  - Type in the editor in Tab 1 → text appears in Tab 2 in real time
  - Type in Tab 2 → appears in Tab 1

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: Phase 1 complete — rooms, admit control, collaborative editor"
```

---

## What's Next

Phase 2 (Whiteboard), Phase 3 (Video/Audio), and Phase 4 (Code Execution) each get their own implementation plan. Start Phase 2 with `/writing-plans` once Phase 1 ships.
