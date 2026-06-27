# CollabCode VS Code Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current amateur dark UI with a VS Code Dark+–inspired design across all client components.

**Architecture:** Update color tokens globally (CSS vars → RGB, VS Code exact values), refactor participant colors to Tailwind class names, then redesign each component top-down: HomePage → RoomShell → WorkspaceTabs → OutputPanel → VideoSidebar → smaller components. No inline styles anywhere — Tailwind classes only.

**Tech Stack:** React 18, Tailwind CSS v3, shadcn/ui (Radix primitives), allotment (resizable split panels), lucide-react (icons)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/client/src/index.css` | Modify | CSS variable values (HSL → RGB, VS Code colors), `color-scheme`, `touch-action` |
| `apps/client/tailwind.config.ts` | Modify | RGB token notation, `user-*` color tokens, safelist |
| `apps/client/src/lib/colors.ts` | Modify | Return `UserColorClasses` Tailwind class names instead of hex strings |
| `apps/client/src/pages/HomePage.tsx` | Modify | Vertical-split layout, branding left, form right, shadcn Label/Separator/Spinner |
| `apps/client/src/components/RoomShell.tsx` | Modify | VS Code header with mini avatars, pulsing dot |
| `apps/client/src/components/WorkspaceTabs.tsx` | Modify | shadcn Tabs primitive, file-tab styling, allotment drag-to-split via ref |
| `apps/client/src/components/OutputPanel.tsx` | Modify | Header row, shadcn ScrollArea, role="log" |
| `apps/client/src/components/VideoSidebar.tsx` | Modify | Narrower, avatars + Tooltip only, Tailwind color classes |
| `apps/client/src/components/KnockBanner.tsx` | Modify | Amber accent, role="alert" |
| `apps/client/src/components/LobbyView.tsx` | Modify | shadcn Spinner, role="status" |
| `apps/client/src/components/EditorPanel.tsx` | Modify | Spinner on Run button |

---

## Task 1: Install shadcn components + lucide-react

**Files:**
- No source files changed — installs packages and generates component files

- [ ] **Step 1: Add new shadcn components**

Run from the repo root:
```bash
npx shadcn@latest add label separator tooltip scroll-area spinner tabs -c apps/client --yes
```

Expected: generates files in `apps/client/src/components/ui/` for label, separator, tooltip, scroll-area, spinner, tabs.

- [ ] **Step 2: Install lucide-react**

```bash
npm install lucide-react --workspace=apps/client
```

Expected: `lucide-react` appears in `apps/client/package.json` dependencies.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Color system — index.css + tailwind.config.ts

**Files:**
- Modify: `apps/client/src/index.css`
- Modify: `apps/client/tailwind.config.ts`

- [ ] **Step 1: Replace index.css**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 30 30 30;
    --foreground: 204 204 204;
    --muted: 37 37 38;
    --muted-foreground: 133 133 133;
    --card: 45 45 48;
    --card-foreground: 204 204 204;
    --border: 60 60 60;
    --input: 60 60 60;
    --primary: 0 122 204;
    --primary-foreground: 255 255 255;
    --secondary: 42 45 46;
    --secondary-foreground: 204 204 204;
    --accent: 42 45 46;
    --accent-foreground: 204 204 204;
    --destructive: 232 17 35;
    --destructive-foreground: 255 255 255;
    --ring: 0 122 204;
    --radius: 0.25rem;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { color-scheme: dark; }
html, body, #root { height: 100%; overflow: hidden; }
body {
  font-family: system-ui, sans-serif;
  background: rgb(var(--background));
  color: rgb(var(--foreground));
  touch-action: manipulation;
}
```

- [ ] **Step 2: Replace tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    {
      pattern: /^(bg|text|border|ring)-user-(red|emerald|blue|amber|cyan|violet|pink|indigo|green|orange|teal|purple|cobalt|tangerine|forest|rose)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--border))',
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: 'rgb(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'rgb(var(--card))',
          foreground: 'rgb(var(--card-foreground))',
        },
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
        user: {
          red:       '#e03131',
          emerald:   '#2f9e44',
          blue:      '#1971c2',
          amber:     '#f08c00',
          cyan:      '#0c8599',
          violet:    '#7048e8',
          pink:      '#d6336c',
          indigo:    '#5c7cfa',
          green:     '#37b24d',
          orange:    '#f76707',
          teal:      '#1098ad',
          purple:    '#9c36b5',
          cobalt:    '#4263eb',
          tangerine: '#e8590c',
          forest:    '#087f5b',
          rose:      '#c2255c',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 3: Refactor colors.ts to return Tailwind class names

**Files:**
- Modify: `apps/client/src/lib/colors.ts`

- [ ] **Step 1: Replace colors.ts**

Keep `colorForUserId` and `colorLightForUserId` — they are still needed by `useAwareness.ts` (yCollab cursor color) and `BoardPanel.tsx` (tldraw user color). Add `classesForUserId` as a new export alongside them.

```ts
export type UserColorClasses = {
  bg: string;
  text: string;
  border: string;
  ring: string;
};

const HEX_PALETTE: Array<{ color: string; light: string }> = [
  { color: '#e03131', light: '#e0313133' },
  { color: '#2f9e44', light: '#2f9e4433' },
  { color: '#1971c2', light: '#1971c233' },
  { color: '#f08c00', light: '#f08c0033' },
  { color: '#0c8599', light: '#0c859933' },
  { color: '#7048e8', light: '#7048e833' },
  { color: '#d6336c', light: '#d6336c33' },
  { color: '#5c7cfa', light: '#5c7cfa33' },
  { color: '#37b24d', light: '#37b24d33' },
  { color: '#f76707', light: '#f7670733' },
  { color: '#1098ad', light: '#1098ad33' },
  { color: '#9c36b5', light: '#9c36b533' },
  { color: '#4263eb', light: '#4263eb33' },
  { color: '#e8590c', light: '#e8590c33' },
  { color: '#087f5b', light: '#087f5b33' },
  { color: '#c2255c', light: '#c2255c33' },
];

const CLASS_PALETTE: UserColorClasses[] = [
  { bg: 'bg-user-red',       text: 'text-user-red',       border: 'border-user-red',       ring: 'ring-user-red'       },
  { bg: 'bg-user-emerald',   text: 'text-user-emerald',   border: 'border-user-emerald',   ring: 'ring-user-emerald'   },
  { bg: 'bg-user-blue',      text: 'text-user-blue',      border: 'border-user-blue',      ring: 'ring-user-blue'      },
  { bg: 'bg-user-amber',     text: 'text-user-amber',     border: 'border-user-amber',     ring: 'ring-user-amber'     },
  { bg: 'bg-user-cyan',      text: 'text-user-cyan',      border: 'border-user-cyan',      ring: 'ring-user-cyan'      },
  { bg: 'bg-user-violet',    text: 'text-user-violet',    border: 'border-user-violet',    ring: 'ring-user-violet'    },
  { bg: 'bg-user-pink',      text: 'text-user-pink',      border: 'border-user-pink',      ring: 'ring-user-pink'      },
  { bg: 'bg-user-indigo',    text: 'text-user-indigo',    border: 'border-user-indigo',    ring: 'ring-user-indigo'    },
  { bg: 'bg-user-green',     text: 'text-user-green',     border: 'border-user-green',     ring: 'ring-user-green'     },
  { bg: 'bg-user-orange',    text: 'text-user-orange',    border: 'border-user-orange',    ring: 'ring-user-orange'    },
  { bg: 'bg-user-teal',      text: 'text-user-teal',      border: 'border-user-teal',      ring: 'ring-user-teal'      },
  { bg: 'bg-user-purple',    text: 'text-user-purple',    border: 'border-user-purple',    ring: 'ring-user-purple'    },
  { bg: 'bg-user-cobalt',    text: 'text-user-cobalt',    border: 'border-user-cobalt',    ring: 'ring-user-cobalt'    },
  { bg: 'bg-user-tangerine', text: 'text-user-tangerine', border: 'border-user-tangerine', ring: 'ring-user-tangerine' },
  { bg: 'bg-user-forest',    text: 'text-user-forest',    border: 'border-user-forest',    ring: 'ring-user-forest'    },
  { bg: 'bg-user-rose',      text: 'text-user-rose',      border: 'border-user-rose',      ring: 'ring-user-rose'      },
];

function paletteIndex(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % HEX_PALETTE.length;
}

// Kept for use by useAwareness.ts (yCollab cursor) and BoardPanel.tsx (tldraw user color)
export function colorForUserId(userId: string): string {
  return HEX_PALETTE[paletteIndex(userId)].color;
}

export function colorLightForUserId(userId: string): string {
  return HEX_PALETTE[paletteIndex(userId)].light;
}

// Use this in React components — returns Tailwind class names, no inline styles needed
export function classesForUserId(userId: string): UserColorClasses {
  return CLASS_PALETTE[paletteIndex(userId)];
}
```

- [ ] **Step 2: Update the colors test**

Open `apps/client/src/tests/colors.test.ts`. Replace the test to match the new API:

```ts
import { describe, it, expect } from 'vitest';
import { classesForUserId } from '../lib/colors';

describe('classesForUserId', () => {
  it('returns an object with bg, text, border, ring keys', () => {
    const classes = classesForUserId('user123');
    expect(classes).toHaveProperty('bg');
    expect(classes).toHaveProperty('text');
    expect(classes).toHaveProperty('border');
    expect(classes).toHaveProperty('ring');
  });

  it('returns Tailwind class strings prefixed correctly', () => {
    const classes = classesForUserId('user123');
    expect(classes.bg).toMatch(/^bg-user-/);
    expect(classes.text).toMatch(/^text-user-/);
    expect(classes.border).toMatch(/^border-user-/);
    expect(classes.ring).toMatch(/^ring-user-/);
  });

  it('returns consistent classes for the same userId', () => {
    expect(classesForUserId('abc')).toEqual(classesForUserId('abc'));
  });

  it('returns different classes for different userIds (at least sometimes)', () => {
    const results = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => classesForUserId(id).bg)
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 3: Run the colors test**

```bash
cd apps/client && npx vitest run src/tests/colors.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 4: Verify no callsite is broken**

`colorForUserId` and `colorLightForUserId` are intentionally kept. Their callsites (`useAwareness.ts`, `BoardPanel.tsx`) do NOT need to change — those pass hex colors to yCollab and tldraw (non-React styling). Only React components rendering DOM elements need to switch to `classesForUserId`. That happens in Task 5 (RoomShell) and Task 8 (VideoSidebar).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: HomePage redesign

**Files:**
- Modify: `apps/client/src/pages/HomePage.tsx`

- [ ] **Step 1: Replace HomePage.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { createRoom, validateRoom } from '../lib/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const displayName = createName.trim();
    if (!displayName || loading) return;
    setLoading(true);
    setCreateError('');
    try {
      const room = await createRoom();
      sessionStorage.setItem('hostSecret', room.hostSecret);
      sessionStorage.setItem('displayName', displayName);
      navigate(`/room/${room.roomId}`);
    } catch {
      setCreateError('Could not create room. Try again.');
      setLoading(false);
    }
  }

  async function handleJoin() {
    const displayName = joinName.trim();
    const targetRoomId = roomId.trim();
    if (!displayName || !targetRoomId || loading) return;
    setLoading(true);
    setJoinError('');
    try {
      const exists = await validateRoom(targetRoomId);
      if (!exists) {
        setJoinError('Room not found. Check the Room ID and try again.');
        setLoading(false);
        return;
      }
      sessionStorage.removeItem('hostSecret');
      sessionStorage.setItem('displayName', displayName);
      navigate(`/room/${targetRoomId}`);
    } catch {
      setJoinError('Room not found. Check the Room ID and try again.');
      setLoading(false);
    }
  }

  return (
    <main className="flex h-full">
      {/* Left — branding */}
      <div className="relative flex flex-1 flex-col items-start justify-center border-r border-border bg-background px-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Code2 size={16} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Collab</span>
            <span className="text-primary">Code</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Code together, in real time.</p>
        <span className="absolute bottom-6 left-16 font-mono text-xs text-muted-foreground/40">
          v1.0.0
        </span>
      </div>

      {/* Right — form */}
      <div className="flex w-[420px] shrink-0 flex-col justify-center bg-muted px-10 py-12 gap-6">
        {/* Create */}
        <section aria-labelledby="create-heading">
          <h2 id="create-heading" className="mb-4 text-sm font-semibold text-foreground">
            Create a Room
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-name">Your name</Label>
              <Input
                id="create-name"
                name="displayName"
                placeholder="Alice…"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
                spellCheck={false}
                autoFocus
                autoComplete="nickname"
              />
            </div>
            <div aria-live="polite" className="min-h-[1rem]">
              {createError ? (
                <p className="text-xs text-destructive">{createError}</p>
              ) : null}
            </div>
            <Button
              onClick={() => void handleCreate()}
              disabled={loading || !createName.trim()}
              className="w-full"
            >
              {loading && !joinName ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating…
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {/* Join */}
        <section aria-labelledby="join-heading">
          <h2 id="join-heading" className="mb-4 text-sm font-semibold text-foreground">
            Join a Room
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="join-name">Your name</Label>
              <Input
                id="join-name"
                name="displayName"
                placeholder="Alice…"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                spellCheck={false}
                autoComplete="nickname"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="room-id">Room ID</Label>
              <Input
                id="room-id"
                name="roomId"
                placeholder="tI7FSTLL8M…"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleJoin(); }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div aria-live="polite" className="min-h-[1rem]">
              {joinError ? (
                <p className="text-xs text-destructive">{joinError}</p>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => void handleJoin()}
              disabled={loading || !joinName.trim() || !roomId.trim()}
              className="w-full"
            >
              {loading && joinName ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Joining…
                </>
              ) : (
                'Join Room'
              )}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run existing HomePage tests**

```bash
cd apps/client && npx vitest run src/tests/HomePage.test.tsx
```

Expected: all tests pass. If any test asserts on old placeholder text ("Your name") or card structure, update the test selectors to use label text ("Your name" label text is still correct, but test queries may need `getByLabelText` instead of `getByPlaceholderText`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 5: RoomShell header redesign

**Files:**
- Modify: `apps/client/src/components/RoomShell.tsx`
- Dependency: Task 3 (classesForUserId) must be complete

- [ ] **Step 1: Replace RoomShell.tsx**

```tsx
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { classesForUserId } from '../lib/colors';
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

export default function RoomShell({
  roomId,
  users,
  isHost,
  children,
  outputPanel,
  knockBanner,
}: RoomShellProps) {
  return (
    <main className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <span className="font-mono text-sm">
          <span className="text-muted-foreground">room/</span>
          <span className="font-medium text-foreground">{roomId}</span>
        </span>
        {isHost ? (
          <Badge
            variant="outline"
            className="border-green-600 bg-green-600/10 text-[10px] text-green-400"
          >
            host
          </Badge>
        ) : null}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Participant mini-avatars */}
          <div className="flex items-center -space-x-1">
            {users.map(user => {
              const c = classesForUserId(user.userId);
              return (
                <Avatar key={user.userId} className="h-5 w-5 ring-1 ring-card">
                  <AvatarFallback className={`${c.bg} text-[9px] font-semibold text-white`}>
                    {user.displayName[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {users.length} online
          </span>
        </div>
      </div>

      {knockBanner}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
          {outputPanel}
        </div>
        <VideoSidebar users={users} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 6: WorkspaceTabs — file tabs + drag-to-split

**Files:**
- Modify: `apps/client/src/components/WorkspaceTabs.tsx`
- Dependency: Task 1 (shadcn tabs installed) must be complete

- [ ] **Step 1: Replace WorkspaceTabs.tsx**

```tsx
import { useRef, useState } from 'react';
import type { AllotmentHandle } from 'allotment';
import { Allotment } from 'allotment';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BoardPanel from './BoardPanel';
import EditorPanel from './EditorPanel';
import 'allotment/dist/style.css';
import type { LanguageId } from '../types';

type ActiveTab = 'code' | 'board';

interface WorkspaceTabsProps {
  roomId: string;
  userId: string;
  displayName: string;
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  connected: boolean;
  running?: boolean;
  onRun?: (request: { language: LanguageId; code: string }) => void | Promise<void>;
}

const DEFAULT_SPLIT: [number, number] = [60, 40];

export default function WorkspaceTabs({
  roomId,
  userId,
  displayName,
  ydoc,
  provider,
  connected,
  running,
  onRun,
}: WorkspaceTabsProps) {
  const allotmentRef = useRef<AllotmentHandle>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');
  const [isSplit, setIsSplit] = useState(false);

  function handleTabChange(value: string) {
    const tab = value as ActiveTab;
    setActiveTab(tab);
    if (!isSplit) {
      allotmentRef.current?.resize(tab === 'code' ? [100, 0] : [0, 100]);
    }
  }

  function handlePaneChange(sizes: number[]) {
    const [codeSize, boardSize] = sizes;
    const nowSplit = codeSize > 10 && boardSize > 10;
    if (nowSplit !== isSplit) {
      setIsSplit(nowSplit);
    }
    // When a pane collapses to near-zero, sync activeTab
    if (!nowSplit) {
      if (codeSize <= 10) setActiveTab('board');
      if (boardSize <= 10) setActiveTab('code');
    }
  }

  const codeTabClass = (isSplit || activeTab === 'code')
    ? 'h-full rounded-none border-r border-border border-t-2 border-t-primary bg-background px-4 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-none'
    : 'h-full rounded-none border-r border-border bg-muted px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-none';

  const boardTabClass = (isSplit || activeTab === 'board')
    ? 'h-full rounded-none border-r border-border border-t-2 border-t-primary bg-background px-4 text-sm text-foreground data-[state=active]:bg-background data-[state=active]:shadow-none'
    : 'h-full rounded-none border-r border-border bg-muted px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-none';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="h-[35px] w-full justify-start rounded-none border-b border-border bg-muted p-0">
          <TabsTrigger value="code" className={codeTabClass}>
            main.js
          </TabsTrigger>
          <TabsTrigger value="board" className={boardTabClass}>
            Board
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1">
          <Allotment
            ref={allotmentRef}
            defaultSizes={[100, 0]}
            onChange={handlePaneChange}
          >
            <Allotment.Pane minSize={0}>
              <EditorPanel
                ydoc={ydoc}
                provider={provider}
                connected={connected}
                running={running}
                onRun={onRun}
              />
            </Allotment.Pane>
            <Allotment.Pane minSize={0} snap>
              <BoardPanel roomId={roomId} userId={userId} displayName={displayName} />
            </Allotment.Pane>
          </Allotment>
        </div>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Run existing WorkspaceTabs tests**

```bash
cd apps/client && npx vitest run src/tests/WorkspaceTabs.test.tsx
```

Expected: all tests pass. Update any test that looks for a "Split" button — remove those assertions.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 7: OutputPanel upgrade

**Files:**
- Modify: `apps/client/src/components/OutputPanel.tsx`
- Dependency: Task 1 (shadcn scroll-area installed) must be complete

- [ ] **Step 1: Replace OutputPanel.tsx**

```tsx
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExecutionOutput } from '../types';

interface OutputPanelProps {
  output: ExecutionOutput;
}

export default function OutputPanel({ output }: OutputPanelProps) {
  const hasStdout = output.stdout.length > 0;
  const hasStderr = output.stderr.length > 0;

  const statusBadge =
    output.status === 'success'
      ? { label: `Exit ${output.exitCode ?? 0}`, className: 'border-green-600 text-green-400 bg-green-600/10' }
      : output.status === 'error'
        ? { label: 'Error', className: 'border-destructive text-destructive bg-destructive/10' }
        : null;

  const statusLabel =
    output.status === 'idle'
      ? 'Ready'
      : output.status === 'running'
        ? 'Running…'
        : output.status === 'success'
          ? `Exit ${output.exitCode ?? 0}`
          : 'Error';

  return (
    <div className="flex max-h-48 min-h-16 shrink-0 flex-col border-t border-border bg-background">
      {/* Header */}
      <div className="flex h-7 shrink-0 items-center border-b border-border bg-muted px-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true">▶</span>
          Output
          {output.ranBy ? (
            <span className="text-muted-foreground/60">· ran by {output.ranBy}</span>
          ) : null}
        </span>
        {statusBadge ? (
          <Badge variant="outline" className={`ml-auto text-[10px] ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">{statusLabel}</span>
        )}
      </div>

      {/* Output content */}
      <ScrollArea className="flex-1">
        <div
          role="log"
          aria-live="polite"
          className="px-3 py-2 font-mono text-xs text-green-300"
        >
          {output.status === 'idle' ? (
            <span className="text-muted-foreground">Run code to see output.</span>
          ) : null}
          {output.status === 'running' ? (
            <span className="text-muted-foreground">Executing…</span>
          ) : null}
          {output.error ? (
            <pre className="whitespace-pre-wrap text-red-300">{output.error}</pre>
          ) : null}
          {hasStdout ? (
            <pre className="whitespace-pre-wrap">{output.stdout}</pre>
          ) : null}
          {hasStderr ? (
            <pre className="whitespace-pre-wrap text-red-300">{output.stderr}</pre>
          ) : null}
          {output.status === 'success' && !hasStdout && !hasStderr ? (
            <span className="text-muted-foreground">Process finished with no output.</span>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Run existing OutputPanel tests**

```bash
cd apps/client && npx vitest run src/tests/OutputPanel.test.tsx
```

Expected: all tests pass. Update any test that checks for `"Running"` text — it is now `"Running…"`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 8: VideoSidebar upgrade

**Files:**
- Modify: `apps/client/src/components/VideoSidebar.tsx`
- Dependency: Task 1 (shadcn tooltip installed) and Task 3 (classesForUserId) must be complete

- [ ] **Step 1: Replace VideoSidebar.tsx**

```tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { classesForUserId } from '../lib/colors';
import type { AwarenessUser } from '../hooks/useAwareness';

interface VideoSidebarProps {
  users: AwarenessUser[];
}

export default function VideoSidebar({ users }: VideoSidebarProps) {
  return (
    <aside
      aria-label="Participants"
      className="flex w-14 shrink-0 flex-col items-center gap-2 border-l border-border bg-muted p-2"
    >
      <p className="mb-1 text-center text-[9px] uppercase tracking-widest text-muted-foreground">
        Live
      </p>
      <TooltipProvider delayDuration={300}>
        <ul className="flex flex-col items-center gap-2">
          {users.map(user => {
            const c = classesForUserId(user.userId);
            return (
              <li key={user.userId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className={`h-8 w-8 ring-2 ${c.ring} ring-offset-1 ring-offset-muted`}>
                      <AvatarFallback className={`${c.bg} text-xs font-semibold text-white`}>
                        {user.displayName[0]?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{user.displayName}</p>
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </TooltipProvider>
    </aside>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

---

## Task 9: KnockBanner, LobbyView, EditorPanel toolbar

**Files:**
- Modify: `apps/client/src/components/KnockBanner.tsx`
- Modify: `apps/client/src/components/LobbyView.tsx`
- Modify: `apps/client/src/components/EditorPanel.tsx`
- Dependency: Task 1 (shadcn spinner installed) must be complete

- [ ] **Step 1: Replace KnockBanner.tsx**

```tsx
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
    <div
      role="alert"
      aria-live="assertive"
      className="flex shrink-0 flex-col gap-2 border-b border-amber-500/40 bg-amber-500/5 px-3 py-2"
    >
      {knocks.map(knock => (
        <div key={knock.requestId} className="flex items-center gap-3 text-sm">
          <span>
            <strong className="font-semibold text-amber-200">{knock.displayName}</strong>
            <span className="text-muted-foreground"> wants to join</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-green-600 text-green-400 hover:bg-green-600/10"
            onClick={() => onAdmit(knock.requestId)}
          >
            Admit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-destructive text-destructive hover:bg-destructive/10"
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

- [ ] **Step 2: Replace LobbyView.tsx**

```tsx
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface LobbyViewProps {
  displayName: string;
  denied: boolean;
  onRetry: () => void;
}

export default function LobbyView({ displayName, denied, onRetry }: LobbyViewProps) {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      {denied ? (
        <>
          <p className="text-lg text-foreground">
            The host didn't let you in, <strong>{displayName}</strong>.
          </p>
          <Button onClick={onRetry}>Try Again</Button>
        </>
      ) : (
        <>
          <div role="status" aria-label="Waiting for host to admit you">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg text-foreground">
            Waiting for the host to let you in, <strong>{displayName}</strong>.
          </p>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Update EditorPanel.tsx — add Spinner to Run button**

In `apps/client/src/components/EditorPanel.tsx`, find the Run button (around line 168) and update it:

```tsx
import { Spinner } from '@/components/ui/spinner';

// ... existing imports stay ...

// Replace the Run Button (around line 168–175):
<Button
  type="button"
  size="sm"
  onClick={handleRun}
  disabled={!connected || running || !onRun}
  className="flex items-center gap-1.5"
>
  {running ? (
    <>
      <Spinner className="h-3.5 w-3.5" />
      Running…
    </>
  ) : (
    'Run'
  )}
</Button>
```

- [ ] **Step 4: Run all component tests**

```bash
cd apps/client && npx vitest run src/tests/KnockBanner.test.tsx src/tests/LobbyView.test.tsx
```

Expected: all tests pass. Update any test asserting on spinner structure if needed.

- [ ] **Step 5: Final TypeScript check**

```bash
cd apps/client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
cd apps/client && npx vitest run
```

Expected: all tests pass.
