# CollabCode — Design Spec
**Date:** 2026-04-30

## Overview

CollabCode is a browser-based collaborative workspace for small teams (2–10 people). Users join rooms via a shareable link, pick a display name, and get a real-time shared code editor, whiteboard, and video call — no accounts required.

**Primary use case:** General-purpose team workspace — pair programming, design discussions, code reviews, ad-hoc standups.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript | Industry standard, strong ecosystem |
| Real-time sync | Yjs + Hocuspocus | CRDT-based, conflict-free, one layer handles all collaborative state |
| Code editor | CodeMirror 6 + y-codemirror.next | Lightweight, extensible, has first-class Yjs binding |
| Whiteboard | tldraw | Polished, has native Yjs store adapter |
| Video / audio | Agora Web SDK | Free 10k min/month, user has prior experience |
| Code execution | Piston (self-hosted Docker) | 70+ languages, sandboxed, no vendor cost |
| Backend | Node.js (Express) | Familiar, good WS support |
| Persistence | LevelDB (via Hocuspocus) | Zero-config, persists Y.Doc per room |

---

## Architecture

Three backend services + one external managed service:

```
Browser (React)
  ├── Room Shell          — join/create, participant list
  ├── Code Editor         — CodeMirror 6 + y-codemirror
  ├── Whiteboard          — tldraw + Yjs store adapter
  └── Video Panel         — Agora Web SDK (permanent right sidebar)

Backend
  ├── Room API            — Node.js/Express, HTTP :3000
  ├── Hocuspocus Server   — Yjs WS sync, :1234
  └── Piston              — Docker, code execution, :2000

External
  └── Agora               — managed WebRTC (video + audio)
```

**One Y.Doc per room** with namespaced subdocuments:
- `room/<id>/editor` — code editor state
- `room/<id>/board` — tldraw canvas state
- `room/<id>/output` — latest execution result

Yjs Awareness (lightweight side-channel on the same WS) carries presence: display names, cursor positions, current panel focus.

---

## Room API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/rooms` | Create room, returns `{ roomId, hostSecret }` |
| `GET` | `/rooms/:id` | Validate room exists |
| `POST` | `/rooms/:id/join` | Enter lobby or get token if host / auto-admitted |
| `POST` | `/rooms/:id/admit` | Host-only: admit or deny a waiting joiner |
| `POST` | `/rooms/:id/execute` | Proxy to Piston, rate-limited |

Agora tokens are minted server-side using the room ID as the channel name. Non-host joiners do not receive a token until the host admits them.

---

## Data Flows

### 1 — Room Join (with Admit Control)

**Creator (host):**
1. `POST /rooms` → returns `{ roomId, hostSecret }`. Creator stores `hostSecret` in sessionStorage.
2. Creator joins via `POST /rooms/:id/join { hostSecret }` → immediately admitted, receives Agora token.
3. Room API marks creator as host server-side (in-memory, keyed by their socket connection).

**Non-host joiner:**
1. `POST /rooms/:id/join { displayName }` → Room API creates a pending request, returns `{ status: "waiting" }`.
2. Room API broadcasts a `knock` event to the host over their existing WebSocket connection: `{ type: "knock", userId, displayName }`.
3. Host sees an admit/deny prompt in the UI.
4. Host calls `POST /rooms/:id/admit { userId, decision: "admit" | "deny" }`.
5. On admit: Room API issues Agora token, sends it to the waiting browser via SSE or a long-poll response.
6. On deny: waiting browser receives `{ status: "denied" }` and shows a rejection message.
7. Once admitted: browser opens WebSocket to Hocuspocus, Agora SDK joins channel — same as before.

**Edge cases:**
- **Host not in room yet:** Joiner waits in lobby until host joins. No timeout — they simply wait.
- **Host leaves mid-session:** Room API promotes the longest-connected remaining participant to host. New host receives a `{ type: "host-promoted" }` WS event and their UI updates accordingly. Future knock requests go to them.
- **Room is empty when joiner arrives (host never joined):** Joiner waits. If they are the host (provides `hostSecret`), they are auto-admitted as usual.

### 2 — Real-time Collaboration (Yjs CRDT)
1. User edits code → CodeMirror produces a binary Yjs update
2. `y-codemirror` sends update over WebSocket to Hocuspocus
3. Hocuspocus merges into server Y.Doc, broadcasts to all peers
4. All peers apply update instantly — no locking, no merge conflicts
5. Same flow for tldraw (via its Yjs store adapter) and board strokes

### 3 — Code Execution
1. User clicks Run → `POST /rooms/:id/execute { language, code, stdin? }`
2. Room API enforces rate limit (1 execution / 5s per room)
3. Proxies to Piston: `POST /api/v2/execute` with `run_timeout: 10s`, memory cap
4. Result `{ stdout, stderr, exitCode }` returned to browser
5. Browser writes result into `room/<id>/output` Y.Doc → all members see the same output

---

## UI Layout

**Layout model: VS Code-style tab groups + permanent video sidebar**

```
┌─────────────────────────────────────────────┬──────────┐
│  room/xk29a                        3 online │  VIDEO   │
├──────────────────┬──────────────────────────│  SIDEBAR │
│ ⌨ main.js  ✏ Board (tab)          │          │  (fixed) │
├──────────────────┤  (split when board       │          │
│                  │   tab is dragged over)   │  👤 Sam  │
│  Code Editor     │                          │  👤 Alex │
│  (CodeMirror)    │  Whiteboard              │  👤 Maya │
│                  │  (tldraw)                │          │
│                  │                          │  🎤 📷   │
├──────────────────┴──────────────────────────│          │
│  ▶ Output panel (shared, Yjs-synced)        │          │
└─────────────────────────────────────────────┴──────────┘
```

**Rules:**
- Video sidebar is always visible, never toggleable. Mic/camera buttons sit at the bottom of each tile.
- Board is a tab in the editor tab bar. Click to switch to it full-screen. Drag the tab to the right half to pin it side-by-side with the code editor.
- The board's Yjs state syncs in the background whether the panel is visible or not.
- Output panel is pinned below the editor area and shows the last execution result, shared across the room.

**Implementation:** `allotment` (the same split-pane lib VS Code uses) for the resizable code/board split. The video sidebar is a fixed-width flex column outside the allotment container.

---

## Implementation Phases

Each phase is independently shippable and usable.

### Phase 1 — Room + Code Editor
- Room creation, join flow, display name, shareable link
- Host/admit control: `hostSecret`, knock flow, admit/deny UI
- Hocuspocus server + Room API
- CodeMirror 6 editor with Yjs sync
- Participant presence (awareness: names, cursor colors, host badge)
- Output panel (static, no execution yet)

### Phase 2 — Whiteboard
- tldraw integrated with Yjs store adapter
- Board tab in the editor tab bar
- Drag-to-split panel behaviour (allotment)

### Phase 3 — Video / Audio
- Agora Web SDK integration
- Permanent video sidebar with tile grid
- Mic/camera toggle per user
- Server-side Agora token minting

### Phase 4 — Code Execution
- Piston self-hosted Docker setup
- `/execute` endpoint on Room API with rate limiting
- Run button in the editor toolbar
- Execution output broadcast via Yjs

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Hocuspocus WS drops | Auto-reconnect with exponential backoff; editor goes read-only until reconnected |
| Room not found | 404 page with option to create a new room |
| Code execution timeout (>10s) | Return `{ error: "timeout" }`, show in output panel |
| Piston down | Room API returns 503; Run button shows "Execution unavailable" |
| Agora token expired | Re-fetch token from Room API silently, rejoin channel |
| User joins room with >10 people | Room API rejects join with 403 + "Room is full" message |
| Joiner denied by host | Browser shows "The host didn't let you in" with option to request again |
| Host disconnects before admitting a waiting joiner | Promoted host inherits the pending knock queue and sees it immediately |
| `hostSecret` lost (e.g. browser refresh) | Host rejoins with `hostSecret` from sessionStorage — Room API recognises and re-grants host role |

---

## Security Constraints

- Piston is never accessible directly from the browser — always proxied through Room API
- Agora tokens are short-lived (1 hour), minted server-side, scoped to a single channel, and only issued after host admits the joiner
- `hostSecret` is a cryptographically random nanoid (21 chars), never stored in the URL, only in sessionStorage
- Y.Doc is persisted in LevelDB for 24 hours after the last user leaves (TTL-based cleanup), then permanently deleted — no long-term storage
- Execution sandbox: Piston enforces CPU time limit (10s), memory cap (256MB), no network access inside container

---

## Out of Scope

- User accounts or authentication beyond display name
- Room history / replay
- Multiple simultaneous code files
- Chat / text messaging
- Mobile support (desktop browser only for v1)
