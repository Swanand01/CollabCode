# Type Organisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split scattered types into categorised files per app, and remove exported interfaces from hook and component files.

**Architecture:** Two independent tasks — client first, then server. Each task creates a `types/` directory with an `index.ts` barrel, migrates all types into categorised files, deletes the old flat `types.ts`, and updates all import sites. No shared package; no behaviour changes.

**Tech Stack:** TypeScript 5.4, Vitest, `moduleResolution: Bundler` (client), `moduleResolution: NodeNext` (server)

## Global Constraints

- No shared package between client and server
- No behaviour changes — pure structural refactor
- All existing tests must pass after each task
- TypeScript must compile cleanly (`tsc --noEmit`) after each task
- Server imports use `.js` extension (NodeNext resolution)
- Client imports omit extension (Bundler resolution)

---

### Task 1: Reorganise client types

**Files:**
- Create: `apps/client/src/types/api.ts`
- Create: `apps/client/src/types/room.ts`
- Create: `apps/client/src/types/index.ts`
- Delete: `apps/client/src/types.ts`
- Modify: `apps/client/src/hooks/useAwareness.ts`
- Modify: `apps/client/src/hooks/useAgora.ts`
- Modify: `apps/client/src/components/video-sidebar/VideoSidebar.tsx`
- Modify: `apps/client/src/components/video-sidebar/UserTile.tsx`
- Modify: `apps/client/src/components/WorkspaceTabs.tsx`
- Modify: `apps/client/src/tests/VideoSidebar.test.tsx`

**Interfaces:**
- Produces: `types/index.ts` barrel re-exporting all types from `api.ts` and `room.ts`
- All existing `from '../types'` and `from '../../types'` imports continue to resolve via the barrel

- [ ] **Step 1: Verify baseline — tests pass**

Run from repo root:
```bash
npm run test -w apps/client
```
Expected: all tests pass. If any fail, fix before proceeding.

- [ ] **Step 2: Create `apps/client/src/types/api.ts`**

```ts
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

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

- [ ] **Step 3: Create `apps/client/src/types/room.ts`**

```ts
import type {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

export type LanguageId = 'javascript' | 'typescript' | 'python' | 'go';

export interface ExecutionOutput {
  status: 'idle' | 'running' | 'success' | 'error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  language?: LanguageId;
  ranBy?: string;
  ranAt?: number;
  error?: string;
}

export interface AwarenessUser {
  userId: string;
  name: string;
  displayName: string;
  color: string;
  colorLight: string;
}

export interface AgoraState {
  localVideoTrack: ICameraVideoTrack | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
}
```

- [ ] **Step 4: Create `apps/client/src/types/index.ts`**

```ts
export * from './api';
export * from './room';
```

- [ ] **Step 5: Delete `apps/client/src/types.ts`**

```bash
rm apps/client/src/types.ts
```

All existing imports like `from '../types'` and `from '../../types'` now resolve to `types/index.ts` via Bundler resolution — no import path changes needed for these.

- [ ] **Step 6: Update `useAwareness.ts` — remove the `AwarenessUser` interface, import from types**

Replace the file content at `apps/client/src/hooks/useAwareness.ts`:

```ts
import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessUser } from '../types';
import { colorForUserId, colorLightForUserId } from '../lib/colors';

export function useAwareness(
  provider: HocuspocusProvider | null,
  userId: string,
  displayName: string,
) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    if (!awareness) return;

    const localUser = {
      userId,
      name: displayName,
      displayName,
      color: colorForUserId(userId),
      colorLight: colorLightForUserId(userId),
    };

    const syncUsers = () => {
      const states = [...awareness.getStates().values()];
      const nextUsers = states
        .map(state => state.user)
        .filter((user): user is AwarenessUser => Boolean(user));
      setUsers(nextUsers);
    };

    awareness.setLocalStateField('user', localUser);
    syncUsers();
    awareness.on('update', syncUsers);

    return () => {
      awareness.off('update', syncUsers);
    };
  }, [displayName, provider, userId]);

  return users;
}
```

- [ ] **Step 7: Update `useAgora.ts` — remove the `AgoraState` interface, import from types**

Replace the file content at `apps/client/src/hooks/useAgora.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import type { AgoraState } from '../types';
import { fetchAgoraToken } from '../lib/api';

AgoraRTC.setLogLevel(4);

export function useAgora(roomId: string, userId: string): AgoraState {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);

  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    let active = true;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack?.play();
      setRemoteUsers(prev => {
        const exists = prev.some(u => u.uid === user.uid);
        return exists ? prev.map(u => (u.uid === user.uid ? user : u)) : [...prev, user];
      });
    });

    client.on('user-unpublished', user => {
      setRemoteUsers(prev => prev.map(u => (u.uid === user.uid ? user : u)));
    });

    client.on('user-left', user => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    async function join() {
      const { token, appId, channel } = await fetchAgoraToken(roomId, userId);
      if (!active) return;

      await client.join(appId, channel, token, userId);
      if (!active) {
        await client.leave();
        return;
      }
    }

    client.on('token-privilege-will-expire', async () => {
      const { token } = await fetchAgoraToken(roomId, userId);
      await client.renewToken(token);
    });

    void join();

    return () => {
      active = false;
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      localVideoRef.current = null;
      localAudioRef.current = null;
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setRemoteUsers([]);
      void client.leave();
    };
  }, [roomId, userId]);

  async function toggleCamera() {
    const client = clientRef.current;
    if (!client) return;
    if (!localVideoRef.current) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        await client.publish([videoTrack]);
        setCameraOn(true);
      } catch {
        // Camera not available
      }
      return;
    }
    const next = !cameraOn;
    await localVideoRef.current.setEnabled(next);
    setCameraOn(next);
  }

  async function toggleMic() {
    const client = clientRef.current;
    if (!client) return;
    if (!localAudioRef.current) {
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        await client.publish([audioTrack]);
        setMicOn(true);
      } catch {
        // Mic not available
      }
      return;
    }
    const next = !micOn;
    await localAudioRef.current.setEnabled(next);
    setMicOn(next);
  }

  return { localVideoTrack, localAudioTrack, remoteUsers, cameraOn, micOn, toggleCamera, toggleMic };
}
```

- [ ] **Step 8: Update `VideoSidebar.tsx` — import types from `../../types` instead of hook files**

Replace the first two lines of `apps/client/src/components/video-sidebar/VideoSidebar.tsx`:

```ts
import type { AwarenessUser, AgoraState } from '../../types';
```

Remove these two lines:
```ts
import type { AwarenessUser } from '../../hooks/useAwareness';
import type { AgoraState } from '../../hooks/useAgora';
```

- [ ] **Step 9: Update `UserTile.tsx` — import `AwarenessUser` from `../../types`, remove export from `UserTileProps`**

In `apps/client/src/components/video-sidebar/UserTile.tsx`:

Change line 4 from:
```ts
import type { AwarenessUser } from '../../hooks/useAwareness';
```
to:
```ts
import type { AwarenessUser } from '../../types';
```

Change line 13 from:
```ts
export interface UserTileProps {
```
to:
```ts
interface UserTileProps {
```

- [ ] **Step 10: Update `WorkspaceTabs.tsx` — remove export from `WorkspaceTabsProps`**

In `apps/client/src/components/WorkspaceTabs.tsx`, change line 10 from:
```ts
export interface WorkspaceTabsProps {
```
to:
```ts
interface WorkspaceTabsProps {
```

- [ ] **Step 11: Update `VideoSidebar.test.tsx` — import types from `../types` instead of hook files**

In `apps/client/src/tests/VideoSidebar.test.tsx`, replace lines 4–5:
```ts
import type { AwarenessUser } from '../hooks/useAwareness';
import type { AgoraState } from '../hooks/useAgora';
```
with:
```ts
import type { AwarenessUser, AgoraState } from '../types';
```

- [ ] **Step 12: Run TypeScript compiler**

```bash
cd apps/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 13: Run tests**

```bash
npm run test -w apps/client
```
Expected: all tests pass.

- [ ] **Step 14: Commit**

```bash
git add apps/client/src/types/ apps/client/src/hooks/useAwareness.ts apps/client/src/hooks/useAgora.ts apps/client/src/components/video-sidebar/VideoSidebar.tsx apps/client/src/components/video-sidebar/UserTile.tsx apps/client/src/components/WorkspaceTabs.tsx apps/client/src/tests/VideoSidebar.test.tsx
git rm apps/client/src/types.ts
git commit -m "refactor(client): reorganise types into types/api.ts and types/room.ts"
```

---

### Task 2: Reorganise server types

**Files:**
- Create: `apps/server/src/types/room.ts`
- Create: `apps/server/src/types/board.ts`
- Create: `apps/server/src/types/index.ts`
- Delete: `apps/server/src/types.ts`
- Modify: `apps/server/src/roomStore.ts`
- Modify: `apps/server/src/boardStore.ts`
- Modify: `apps/server/src/boardSync.ts`

**Interfaces:**
- Produces: `types/index.ts` barrel re-exporting all types from `room.ts` and `board.ts`
- `roomStore.ts` imports update from `'./types.js'` to `'./types/index.js'`
- `boardStore.ts` and `boardSync.ts` import their previously-inline types from `'./types/index.js'`

- [ ] **Step 1: Verify baseline — tests pass**

```bash
npm run test -w apps/server
```
Expected: all tests pass. If any fail, fix before proceeding.

- [ ] **Step 2: Create `apps/server/src/types/room.ts`**

```ts
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

- [ ] **Step 3: Create `apps/server/src/types/board.ts`**

```ts
export type BoardSessionMeta = {
  userId: string;
};

export interface BoardSyncRequest {
  roomId: string;
  userId: string;
  sessionId: string;
}
```

- [ ] **Step 4: Create `apps/server/src/types/index.ts`**

```ts
export * from './room.js';
export * from './board.js';
```

- [ ] **Step 5: Delete `apps/server/src/types.ts`**

```bash
rm apps/server/src/types.ts
```

- [ ] **Step 6: Update `roomStore.ts` — change import path**

In `apps/server/src/roomStore.ts`, change line 2 from:
```ts
import type { Room, Participant, KnockRequest } from './types.js';
```
to:
```ts
import type { Room, Participant, KnockRequest } from './types/index.js';
```

- [ ] **Step 7: Update `boardStore.ts` — remove inline `BoardSessionMeta`, import from types**

In `apps/server/src/boardStore.ts`, replace the inline type definition:
```ts
type BoardSessionMeta = {
  userId: string;
};
```
with an import at the top of the file (after existing imports):
```ts
import type { BoardSessionMeta } from './types/index.js';
```

- [ ] **Step 8: Update `boardSync.ts` — remove inline `BoardSyncRequest`, import from types**

In `apps/server/src/boardSync.ts`, replace the inline interface:
```ts
export interface BoardSyncRequest {
  roomId: string;
  userId: string;
  sessionId: string;
}
```
with an import (add after existing imports):
```ts
import type { BoardSyncRequest } from './types/index.js';
```

Note: `BoardSyncRequest` was exported from `boardSync.ts`. After this change it is exported from `types/index.ts` instead. Any consumer that imported it from `boardSync.ts` (check: only `boardSync.test.ts`) must update its import.

- [ ] **Step 9: Update `boardSync.test.ts` if it imports `BoardSyncRequest` from `boardSync`**

Check:
```bash
grep -n "BoardSyncRequest" apps/server/tests/boardSync.test.ts
```

If the import is `from '../src/boardSync.js'`, change it to `from '../src/types/index.js'`.

- [ ] **Step 10: Run TypeScript compiler**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11: Run tests**

```bash
npm run test -w apps/server
```
Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add apps/server/src/types/ apps/server/src/roomStore.ts apps/server/src/boardStore.ts apps/server/src/boardSync.ts
git rm apps/server/src/types.ts
git commit -m "refactor(server): reorganise types into types/room.ts and types/board.ts"
```
