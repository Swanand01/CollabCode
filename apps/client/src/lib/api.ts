import type {
  ExecuteResponse,
  JoinResponse,
  JoinStatusResponse,
  LanguageId,
  PingResponse,
} from '../types';

const BASE = '/rooms';

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : 'Request failed');
  }
  return body as T;
}

export async function createRoom(): Promise<{ roomId: string; hostSecret: string }> {
  const res = await fetch(BASE, { method: 'POST' });
  return readJsonOrThrow(res);
}

export async function validateRoom(roomId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/${roomId}`);
  return res.ok;
}

export async function joinRoom(
  roomId: string,
  displayName: string,
  hostSecret?: string,
  userId?: string,
): Promise<JoinResponse> {
  const res = await fetch(`${BASE}/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName,
      ...(hostSecret ? { hostSecret } : {}),
      ...(userId ? { userId } : {}),
    }),
  });
  return readJsonOrThrow(res);
}

export async function pollJoinStatus(
  roomId: string,
  requestId: string,
): Promise<JoinStatusResponse> {
  const res = await fetch(`${BASE}/${roomId}/join-status/${requestId}`);
  return readJsonOrThrow(res);
}

export async function ping(roomId: string, userId: string): Promise<PingResponse> {
  const res = await fetch(`${BASE}/${roomId}/ping?userId=${encodeURIComponent(userId)}`);
  return readJsonOrThrow(res);
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
  return readJsonOrThrow(res);
}

export async function fetchAgoraToken(
  roomId: string,
  userId: string,
): Promise<{ token: string; appId: string; channel: string }> {
  const res = await fetch(`${BASE}/${roomId}/agora-token?userId=${encodeURIComponent(userId)}`);
  return readJsonOrThrow(res);
}

export async function executeCode(
  roomId: string,
  userId: string,
  language: LanguageId,
  code: string,
  stdin = '',
): Promise<ExecuteResponse> {
  const res = await fetch(`${BASE}/${roomId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, language, code, stdin }),
  });
  return readJsonOrThrow(res);
}
