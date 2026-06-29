import express from 'express';
import { nanoid } from 'nanoid';
import cors from 'cors';
import * as store from './roomStore.js';
import { buildAgoraToken } from './agoraToken.js';

export const app = express();
app.use(cors());
app.use(express.json());

const EXECUTION_COOLDOWN_MS = 1_000;
const executionLastRunAt = new Map<string, number>();

interface ExecuteRequest {
  userId?: string;
  language?: string;
  code?: string;
  stdin?: string;
}

interface PistonResponse {
  message?: string;
  run?: {
    stdout?: string;
    stderr?: string;
    code?: number;
    output?: string;
  };
}

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

// POST /rooms/:id/join — host gets admitted immediately; others enter knock queue
app.post('/rooms/:id/join', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const {
    displayName,
    hostSecret,
    userId: existingUserId,
  } = req.body as {
    displayName?: string;
    hostSecret?: string;
    userId?: string;
  };

  const trimmedDisplayName = displayName?.trim();
  if (!trimmedDisplayName) return res.status(400).json({ error: 'displayName required' });

  if (hostSecret && hostSecret === room.hostSecret) {
    const existingHost = store.getParticipantByDisplayName(req.params.id, trimmedDisplayName);
    if (existingHost) {
      room.hostUserId = existingHost.userId;
      return res.json({ status: 'admitted', userId: existingHost.userId });
    }

    const userId = nanoid(10);
    store.addParticipant(req.params.id, {
      userId,
      displayName: trimmedDisplayName,
      joinedAt: Date.now(),
    });
    room.hostUserId = userId;
    return res.json({ status: 'admitted', userId });
  }

  if (room.participants.size >= 10) return res.status(403).json({ error: 'Room is full' });

  const existingMember = store.getParticipantByDisplayName(req.params.id, trimmedDisplayName);
  if (existingMember) {
    if (existingUserId && existingMember.userId === existingUserId) {
      return res.json({ status: 'admitted', userId: existingMember.userId });
    }
    const STALE_MS = 15_000;
    if (Date.now() - existingMember.lastSeen < STALE_MS) {
      return res.status(409).json({ error: 'Display name already in room' });
    }
    store.removeParticipant(req.params.id, existingMember.userId);
  }

  // Evict stale participants before checking if room is empty
  const now = Date.now();
  for (const [pid, p] of room.participants) {
    if (now - p.lastSeen > 30_000) {
      store.removeParticipant(req.params.id, pid);
    }
  }

  // If the room is empty, auto-admit and promote to host
  if (room.participants.size === 0) {
    const userId = nanoid(10);
    store.addParticipant(req.params.id, {
      userId,
      displayName: trimmedDisplayName,
      joinedAt: Date.now(),
    });
    room.hostUserId = userId;
    return res.json({ status: 'admitted', userId });
  }

  const knock = store.createKnockRequest(req.params.id, trimmedDisplayName);
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
    if (room.participants.size >= 10) {
      return res.status(403).json({ error: 'Room is full' });
    }
    store.addParticipant(req.params.id, {
      userId: knock.userId,
      displayName: knock.displayName,
      joinedAt: Date.now(),
    });
  }

  res.json({ ok: true });
});

// GET /rooms/:id/agora-token?userId=xxx — generate RTC token for admitted participant
app.get('/rooms/:id/agora-token', (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { userId } = req.query as { userId?: string };
  if (!userId || !room.participants.has(userId)) {
    return res.status(403).json({ error: 'Not admitted to room' });
  }

  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) {
    return res.status(503).json({ error: 'Agora not configured' });
  }

  const token = buildAgoraToken(appId, appCertificate, req.params.id, userId);
  res.json({ token, appId, channel: req.params.id });
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
      pendingKnocks: store.getPendingKnocks(req.params.id).map((k) => ({
        requestId: k.requestId,
        displayName: k.displayName,
      })),
    });
  }
  res.json({ isHost: false });
});

// POST /rooms/:id/execute — admitted users can run code through Piston.
app.post('/rooms/:id/execute', async (req, res) => {
  const room = store.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { userId, language, code, stdin } = req.body as ExecuteRequest;
  if (!userId || !room.participants.has(userId)) {
    return res.status(403).json({ error: 'Not admitted to room' });
  }
  if (!language?.trim()) return res.status(400).json({ error: 'language required' });
  if (typeof code !== 'string') return res.status(400).json({ error: 'code required' });

  const now = Date.now();
  const lastRunAt = executionLastRunAt.get(req.params.id) ?? 0;
  const retryAfterMs = EXECUTION_COOLDOWN_MS - (now - lastRunAt);
  if (retryAfterMs > 0) {
    return res.status(429).json({ error: 'Execution rate limited', retryAfterMs });
  }
  executionLastRunAt.set(req.params.id, now);

  try {
    const pistonUrl = process.env.PISTON_URL ?? 'http://localhost:2000';
    const pistonRes = await fetch(`${pistonUrl}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        language: normalizeExecutionLanguage(language),
        version: '*',
        files: [{ content: code }],
        stdin: stdin ?? '',
        run_timeout: 3_000,
      }),
    });

    if (!pistonRes.ok) {
      const errorText = await pistonRes.text();
      let errorMessage = 'Execution unavailable';
      try {
        const parsedError = JSON.parse(errorText) as PistonResponse;
        errorMessage = parsedError.message ?? errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return res.status(503).json({ error: errorMessage });
    }

    const result = (await pistonRes.json()) as PistonResponse;
    return res.json({
      stdout: result.run?.stdout ?? result.run?.output ?? '',
      stderr: result.run?.stderr ?? '',
      exitCode: result.run?.code ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.name : '';
    return res.status(message === 'TimeoutError' || message === 'AbortError' ? 504 : 503).json({
      error:
        message === 'TimeoutError' || message === 'AbortError'
          ? 'Execution timeout'
          : 'Execution unavailable',
    });
  }
});

function normalizeExecutionLanguage(language: string): string {
  if (language === 'javascript') return 'javascript';
  if (language === 'typescript') return 'typescript';
  if (language === 'python') return 'python';
  if (language === 'go') return 'go';
  return language;
}

export function _resetExecuteRateLimitsForTests(): void {
  executionLastRunAt.clear();
}
