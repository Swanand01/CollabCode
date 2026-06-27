# CollabCode VS Code Redesign — Design Spec

**Date:** 2026-05-01  
**Status:** Approved  
**Scope:** Full UI redesign — color system, homepage, room shell, all components

---

## Overview

Replace the current amateur-feeling dark UI with a VS Code–inspired design. Every pixel of empty space goes away. Colors, chrome, and component structure all align with VS Code Dark+ conventions. No status bar (deferred). No inline styles — Tailwind classes only.

---

## 1. Color System

### Strategy

Switch CSS variables from HSL to RGB channels so Tailwind opacity modifiers (`bg-background/50`) work correctly. Update `tailwind.config.ts` to use `rgb(var(--token))` notation. Update `index.css` with VS Code–exact RGB values.

### Token Map

| CSS Variable | Value (RGB channels) | Hex equivalent | Role |
|---|---|---|---|
| `--background` | `30 30 30` | `#1e1e1e` | Editor canvas |
| `--muted` | `37 37 38` | `#252526` | Panels, sidebar, tab bar |
| `--card` | `45 45 48` | `#2d2d30` | Header/titlebar background |
| `--border` | `60 60 60` | `#3c3c3c` | All dividers |
| `--foreground` | `204 204 204` | `#cccccc` | Primary text |
| `--muted-foreground` | `133 133 133` | `#858585` | Secondary/inactive text |
| `--primary` | `0 122 204` | `#007acc` | Accent blue (active tab border, buttons) |
| `--primary-foreground` | `255 255 255` | `#ffffff` | Text on primary |
| `--secondary` | `42 45 46` | `#2a2d2e` | Tab hover state |
| `--accent` | `42 45 46` | `#2a2d2e` | Hover backgrounds |
| `--accent-foreground` | `204 204 204` | `#cccccc` | Text on accent |
| `--input` | `60 60 60` | `#3c3c3c` | Input field backgrounds |
| `--ring` | `0 122 204` | `#007acc` | Focus ring |
| `--destructive` | `232 17 35` | `#e81123` | Error/deny |
| `--destructive-foreground` | `255 255 255` | `#ffffff` | Text on destructive |

Add `color-scheme: dark` to `html` in `index.css`. Add `touch-action: manipulation` to `body`.

### Participant Colors

`colors.ts` currently returns hex strings. Refactor to return Tailwind class name sets:

```ts
export type UserColorClasses = {
  bg: string;       // e.g. 'bg-user-red'
  text: string;     // e.g. 'text-user-red'
  border: string;   // e.g. 'border-user-red'
  ring: string;     // e.g. 'ring-user-red'
};
export function classesForUserId(userId: string): UserColorClasses
```

Define 16 named colors in `tailwind.config.ts` under `colors.user.*` (e.g. `user-red`, `user-green`, `user-blue`, etc.) and add all `bg-user-*`, `text-user-*`, `border-user-*`, `ring-user-*` patterns to the Tailwind safelist. Remove `colorForUserId` and `colorLightForUserId` exports; update all callsites.

---

## 2. Homepage

### Layout

Full-viewport two-column layout. No title bar. No floating cards.

```
┌─────────────────────────┬──────────────────────┐
│  Left panel (~55%)      │  Right panel (~45%)  │
│  bg-background          │  bg-muted            │
│  border-r border-border │                      │
│                         │                      │
│  [icon]                 │  Create a Room       │
│  CollabCode             │  ─────────────────── │
│  Code together,         │  [label] Your name   │
│  in real time.          │  [input]             │
│                         │  [Create Room btn]   │
│                         │                      │
│                         │  [Separator]         │
│                         │                      │
│  v1.0.0                 │  Join a Room         │
│  (bottom, muted)        │  [label] Your name   │
│                         │  [input]             │
│                         │  [label] Room ID     │
│                         │  [input]             │
│                         │  [Join Room btn]     │
│                         │  [error aria-live]   │
└─────────────────────────┴──────────────────────┘
```

### Branding (left panel)

- Icon: 28×28px square with `bg-primary rounded-md` containing Lucide `Code2` icon (`size={16}`, `text-white`)
- Wordmark: `Collab` in `text-foreground font-bold` + `Code` in `text-primary font-bold`, `text-2xl`
- Tagline: `text-sm text-muted-foreground` below wordmark
- Version: `text-xs text-muted-foreground/40 font-mono` pinned to bottom-left

### Form (right panel)

- shadcn `Label` above every `Input` — no placeholder-as-label
- Placeholders use `…` suffix (e.g. `"Alice…"`, `"tI7FSTLL8M…"`)
- `spellCheck={false}` on all inputs, `autocomplete="off"` on Room ID input
- `autoFocus` on Create name input
- shadcn `Separator` between Create and Join sections with `text-xs text-muted-foreground` label "or"
- Error `<p>` wrapped in `aria-live="polite"` container, inline below relevant section
- Button loading state: label becomes `"Creating…"` / `"Joining…"` with shadcn `Spinner`, button disabled
- No `Card` component — raw `<div>` panels with Tailwind bg classes

### New shadcn components used

`label`, `separator`, `spinner`

---

## 3. Room Shell & Tab Bar

### Header (`RoomShell.tsx`)

Height: `h-9` (36px). Background: `bg-card`. Border: `border-b border-border`.

Left side:
- Room ID: `font-mono text-sm` — `room/` in `text-muted-foreground` + ID in `text-foreground font-medium`
- Host badge: shadcn `Badge` with `border-green-600 text-green-400 bg-green-600/10 text-[10px]`

Right side:
- Pulsing dot: `w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse`
- Online count: `text-xs text-muted-foreground`
- Participant avatars: mini stack of shadcn `Avatar` (size `h-5 w-5`, `text-[9px]`) using `classesForUserId` Tailwind classes — show all, no overflow cap in v1

### Tab Bar (`WorkspaceTabs.tsx`)

Replace `Button`-based tabs with shadcn `Tabs` primitive. Height: `h-[35px]`. Background: `bg-muted`. Border: `border-b border-border`.

Active tab classes:
```
bg-background text-foreground border-t-2 border-t-primary border-r border-r-border
```

Inactive tab classes:
```
bg-muted text-muted-foreground border-r border-r-border hover:bg-accent hover:text-foreground
```

No rounded corners (`rounded-none`). No Split button.

### Drag-to-split

Both `EditorPanel` and `BoardPanel` are always mounted inside `Allotment`. The "inactive" panel is collapsed to `minSize: 0, preferredSize: 0`. Switching tabs programmatically expands/collapses via `Allotment` imperative ref — the `AlllotmentHandle` interface exposes a `resize(sizes: number[])` method used to collapse a pane to `0` or restore it to a default split. The drag handle is always rendered — dragging it open reveals the second panel and puts the UI into split mode. When in split mode, both tabs get `border-t-2 border-t-primary`. Closing the drag back to zero (by dragging the handle fully) returns to single-tab mode; the last-clicked tab becomes the active one.

---

## 4. Components

### `OutputPanel.tsx`

- Wrap scrollable content in shadcn `ScrollArea` (replaces raw `overflow-auto`)
- Add header row (`h-7 bg-muted border-b border-border flex items-center px-3`):
  - Left: `▶ Output` label in `text-xs text-muted-foreground`
  - Right: exit code shadcn `Badge` when status is success/error
- `aria-hidden="true"` on `▶` glyph
- Add `role="log" aria-live="polite"` to the output container
- Monospace green-on-dark stays (`font-mono text-xs text-green-300`)

### `VideoSidebar.tsx`

- Width: `w-14` (56px), background: `bg-muted`, `border-l border-border`
- "Live" label: `text-[9px] uppercase tracking-widest text-muted-foreground text-center mb-1`
- Each user: shadcn `Tooltip` (content = full display name) wrapping a shadcn `Avatar`
  - Avatar size: `h-8 w-8`
  - `AvatarFallback` uses `classesForUserId(userId).bg` + `text-white text-xs font-semibold`
  - No name label underneath — tooltip only
- Add `aria-label="Participants"` to `<aside>`
- User list rendered as `<ul>` with `<li>` items

### `KnockBanner.tsx`

- Container: `border-b border-amber-500/40 bg-amber-500/5 px-3 py-2`
- Add `role="alert" aria-live="assertive"` to the outer div
- Display name: `font-semibold text-amber-200`
- Admit button: `border-green-600 text-green-400 hover:bg-green-600/10`
- Deny button: `border-destructive text-destructive hover:bg-destructive/10`

### `LobbyView.tsx`

- Spinner: replace custom `animate-spin` div with shadcn `Spinner` + `role="status" aria-label="Waiting for host to admit you"`
- "Try Again" button: already uses shadcn `Button`

### `EditorPanel.tsx` toolbar

- Background: `bg-muted/70 border-b border-border` (unchanged)
- Run button: shadcn `Button size="sm"` — loading state shows shadcn `Spinner` inline when `running`
- Font size controls stay — already accessible with `aria-label`

---

## 5. New shadcn Components to Install

Run from `apps/client`:

```
npx shadcn@latest add label separator tooltip scroll-area spinner tabs -c apps/client
```

---

## 6. Files Changed

| File | Change |
|---|---|
| `apps/client/src/index.css` | RGB CSS variables, VS Code values, `color-scheme: dark`, `touch-action` |
| `apps/client/tailwind.config.ts` | RGB notation, `user-*` color tokens, safelist |
| `apps/client/src/lib/colors.ts` | Return `UserColorClasses` (Tailwind classes) instead of hex strings |
| `apps/client/src/pages/HomePage.tsx` | Full vertical-split redesign |
| `apps/client/src/components/RoomShell.tsx` | Header redesign, mini avatar stack |
| `apps/client/src/components/WorkspaceTabs.tsx` | `Tabs` primitive, drag-to-split via Allotment ref |
| `apps/client/src/components/OutputPanel.tsx` | `ScrollArea`, header row, `role="log"` |
| `apps/client/src/components/VideoSidebar.tsx` | Narrower, `Tooltip`, Tailwind color classes |
| `apps/client/src/components/KnockBanner.tsx` | Amber accent, `role="alert"` |
| `apps/client/src/components/LobbyView.tsx` | shadcn `Spinner`, `role="status"` |

---

## 7. Out of Scope

- Status bar (explicitly deferred)
- Mobile/responsive layout
- Dark/light mode toggle (stays dark-only)
- Keyboard shortcuts panel
- Activity bar / file explorer sidebar
